# game/engine.py
from __future__ import annotations
from typing import Dict, Optional, Iterable, TYPE_CHECKING
import random
from . import data
from .drops import (
    get_mob_drop, get_boss_drop, get_exploration_drop,
    DROP_SYSTEM, DropSource, DropConfig
)

if TYPE_CHECKING:
    from .models import Player, Enemy  # type-only


# === Centralized encounter + damage handling =================================

class Encounter:
    def __init__(self, engine: "GameEngine", player: "Player", enemy: "Enemy"):
        self.engine = engine
        self.player = player
        self.enemy = enemy
        self.resolved = False
        self.rewarded = False
        self.log = []
        # Backrefs so DoT/indirect damage can resolve combat:
        self.player.current_encounter = self
        self.enemy.current_encounter = self
        # Maintain legacy pointer used elsewhere, if any:
        self.player.encounter = self
        self.enemy.encounter = self

    def reward_player_once(self, source: str = "") -> str:
        """Grant victory rewards once using engine's existing reward methods."""
        if self.rewarded:
            return ""
        self.rewarded = True
        if self.enemy.type == "boss":
            msg = self.engine._handle_boss_victory(self.player, self.enemy)
        else:
            msg = self.engine._handle_mob_victory(self.player, self.enemy)
        self.log.append(f"{msg} (source: {source or 'damage'})")
        return msg

    def end(self):
        """Clear combat state/backrefs."""
        self.resolved = True
        self.player.in_combat = False
        # Clear legacy/compat dict as well
        self.player.combat = None
        # Clear backrefs to avoid stray ticks after end:
        if hasattr(self.player, "current_encounter"):
            self.player.current_encounter = None
        if hasattr(self.enemy, "current_encounter"):
            self.enemy.current_encounter = None


def apply_damage(target, amount: int, source: str = "") -> int:
    """Always use this to change HP. Ends combat & rewards on death from any source."""
    if amount <= 0:
        return 0
    before = getattr(target, "hp", 0)
    target.hp = max(0, before - amount)
    dealt = before - target.hp
    _try_resolve_death(target, source)
    return dealt


def _try_resolve_death(target, source: str):
    enc: Optional[Encounter] = getattr(target, "current_encounter", None) or getattr(target, "encounter", None)

    # Enemy death → reward once and end encounter
    if getattr(target, "is_enemy", False) and getattr(target, "hp", 1) <= 0:
        if enc and not enc.resolved:
            enc.reward_player_once(source)
            enc.end()

    # Player death (for completeness)
    if getattr(target, "is_player", False) and getattr(target, "hp", 1) <= 0:
        if enc and not enc.resolved:
            enc.log.append("Player defeated.")
            enc.end()

def _resolve_victory(state, player_id, now_ts, rng):
    """
    Idempotently handle victory:
    - grant XP/loot
    - clear combat flags
    - persist last combat summary
    Safe to call multiple times.
    """
    cs = state.combat.get(player_id)
    if not cs:
        return False
    if getattr(cs, "resolved", False):
        return False
    if cs.enemy_hp > 0:
        return False

    # --- grant rewards (adjust to your existing APIs) ---
    rewards = state.loot_system.roll(cs.enemy_id, rng)  # expects list[ItemDrop]
    xp_gain = state.combat_system.xp_for(cs.enemy_id)
    p = state.players[player_id]
    p.xp += xp_gain
    for drop in rewards:
        state.inventory.add(player_id, drop.item_id, drop.qty)

    # --- mark resolved + clear combat ---
    cs.resolved = True
    cs.ended_at = now_ts
    state.combat.pop(player_id, None)

    # optional: record last victory summary for messaging
    state.last_victory[player_id] = {
        "xp": xp_gain,
        "rewards": rewards,
        "enemy_id": cs.enemy_id,
    }
    return True

def _encounter_autoresolve_victory(p: "Player", source: str = "") -> Optional[str]:
    """
    If the player is in combat and the enemy HP <= 0, grant rewards once and
    end the encounter. Returns a user-facing message or None.
    Safe to call from any command (run/explore/fight/use/skill).
    """
    if not getattr(p, "combat", None):
        return None
    enemy = p.combat.get("enemy")
    if not enemy:
        return None
    if getattr(enemy, "hp", 1) > 0:
        return None

    # Prefer Encounter to keep reward-once semantics
    enc: Optional[Encounter] = getattr(p, "current_encounter", None) or getattr(p, "encounter", None)
    if enc and not enc.resolved:
        already_rewarded = enc.rewarded
        msg = enc.reward_player_once(source=source or "autovictory")
        enc.end()
        # If we just rewarded now, return a clear spoils line
        if not already_rewarded:
            return msg or "Foe down — you claim your spoils!"
        return "Foe down — you claim your spoils!"
    # Legacy fallback if no Encounter (very rare)
    p.in_combat = False
    p.combat = None
    return "Foe down — you claim your spoils!"


def autoresolve_dead_foes_on_load(players: Iterable["Player"]) -> None:
    """
    Call once at session start / after loading saves to clean up any stale
    combats where the enemy is already dead.
    """
    for p in players:
        if getattr(p, "combat", None) and p.combat.get("enemy") and p.combat["enemy"].hp <= 0:
            _encounter_autoresolve_victory(p, source="load_recovery")

def _maybe_resolve_victory(state, player_id, now_ts, rng):
    cs = state.combat.get(player_id)
    if not cs:
        return False
    if cs.enemy_hp <= 0:
        return _resolve_victory(state, player_id, now_ts, rng)
    return False

class GameEngine:
    def __init__(self, rng: Optional[random.Random] = None):
        self.rng = rng or random

    def _weighted_choice(self, table: list, weights: dict) -> dict:
        """Choose an item from table based on rarity weights."""
        # Group by rarity
        rarity_groups = {}
        for item in table:
            rarity = item.get("rarity", "common")
            if rarity not in rarity_groups:
                rarity_groups[rarity] = []
            rarity_groups[rarity].append(item)

        # Create weighted list
        choices = []
        for rarity, weight in weights.items():
            if rarity in rarity_groups:
                choices.extend([(item, weight) for item in rarity_groups[rarity]])

        # Weighted random selection
        total_weight = sum(weight for _, weight in choices)
        r = self.rng.random() * total_weight

        cumulative = 0
        for item, weight in choices:
            cumulative += weight
            if r <= cumulative:
                return item

        # Fallback to random choice
        return self.rng.choice(table)

    # ---- factories ----
    def new_player(self, username: str) -> "Player":
        from .models import Player  # lazy import to avoid cycles
        return Player(name=username, location=self.rng.choice(data.START_LOCATIONS))

    def make_boss(self, p: "Player") -> "Enemy":
        """Create a boss based on rarity weights, player level, and location."""
        from .models import Enemy  # lazy import
        lvl = max(1, p.level)

        # Filter bosses by current location
        location_appropriate_bosses = []
        for boss_data in data.BOSS_TABLE:
            boss_name = boss_data["name"]
            if boss_name in data.CREATURE_LOCATIONS:
                if p.location in data.CREATURE_LOCATIONS[boss_name]:
                    location_appropriate_bosses.append(boss_data)
            # Note: Bosses without location data are NOT added

        # If none, fall back to common/rare bosses only
        if not location_appropriate_bosses:
            location_appropriate_bosses = [b for b in data.BOSS_TABLE if b.get("rarity", "rare") in ["common", "rare"]]

        # Select by rarity weights
        boss_choice = self._weighted_choice(location_appropriate_bosses, data.BOSS_RARITY_WEIGHTS)

        # Scale by player level & rarity
        rarity_multiplier = {
            "uncommon": 0.85,
            "rare":     1.00,
            "epic":     1.35,
            "legendary":1.75,
            "mythic":   2.30,
        }.get(boss_choice["rarity"], 1.0)

        base_hp = boss_choice["hp"] + int(lvl * 4)
        base_atk = boss_choice["atk"] + int(lvl * 1.5)
        base_armor = boss_choice["armor"] + int(lvl * 0.5)

        hp = int(base_hp * rarity_multiplier)
        atk = int(base_atk * rarity_multiplier)
        armor = int(base_armor * rarity_multiplier)

        return Enemy(
            name=boss_choice["name"],
            hp=hp, max_hp=hp, atk=atk, armor=armor, type="boss",
            creature_type=boss_choice["creature_type"],
            affinity=boss_choice["affinity"],
            rarity=boss_choice["rarity"],
            traits=boss_choice["traits"][:],
            vulnerabilities=boss_choice["vulnerabilities"][:]
        )

    def make_mob(self, p: "Player") -> "Enemy":
        """Create a mob based on rarity weights, player level, and location."""
        from .models import Enemy  # lazy import
        lvl = max(1, p.level)

        # Filter mobs by current location
        location_appropriate_mobs = []
        for mob_data in data.MOB_TABLE:
            mob_name = mob_data["name"]
            if mob_name in data.CREATURE_LOCATIONS:
                if p.location in data.CREATURE_LOCATIONS[mob_name]:
                    location_appropriate_mobs.append(mob_data)
            # Note: Creatures without location data are NOT added

        # If none, fall back to common creatures only
        if not location_appropriate_mobs:
            location_appropriate_mobs = [m for m in data.MOB_TABLE if m.get("rarity", "common") == "common"]

        # Select by rarity weights
        mob_choice = self._weighted_choice(location_appropriate_mobs, data.MOB_RARITY_WEIGHTS)

        # Scale by player level & rarity
        rarity_multiplier = {
            "common":    1.00,
            "uncommon":  1.15,
            "rare":      1.35,
            "epic":      1.60,
            "legendary": 1.90,
            "mythic":    2.40,
        }.get(mob_choice["rarity"], 1.00)

        base_hp = mob_choice["hp"] + int(lvl * 1.5)
        base_atk = mob_choice["atk"] + int(lvl * 0.8)
        base_armor = mob_choice["armor"] + int(lvl * 0.3)

        hp = int(base_hp * rarity_multiplier)
        atk = int(base_atk * rarity_multiplier)
        armor = int(base_armor * rarity_multiplier)

        return Enemy(
            name=mob_choice["name"],
            hp=hp, max_hp=hp, atk=atk, armor=armor, type="mob",
            traits=mob_choice["traits"][:],
            creature_type=mob_choice["creature_type"],
            affinity=mob_choice["affinity"],
            rarity=mob_choice["rarity"],
            vulnerabilities=mob_choice["vulnerabilities"][:]
        )

    # ---- exploration ----
    def random_event(self) -> Dict:
        return data.random_event()

    def handle_choice(self, p: "Player", choice: str) -> str:
        ev = p.pending
        if not ev:
            return "No pending choice. Use !explore or !hunt."

        # Special handling for riddle events
        if choice.lower() == "riddle":
            return self.start_riddle(p)

        # Special handling for travel events
        if choice.lower() == "travel":
            return self.travel_to_new_area(p)

        if choice.lower() not in [c.lower() for c in ev["choices"]]:
            return f"Pick one of: {', '.join(ev['choices'])}"

        roll = self.rng.random()

        # 18% chance for combat encounter
        if roll < 0.18:
            p.pending = None
            return self.start_mob_combat(p)

        msg = ""
        if choice.lower() in ("left", "right", "move", "cross"):
            # Use new drop system instead of hardcoded logic
            if roll < DropConfig.EXPLORATION_GOLD_VS_ITEM_RATIO:
                gold = self.rng.randint(1, 5)
                p.gold += gold
                msg = f"You found {gold} gold."
            else:
                # Use new exploration drop system
                dropped_item = get_exploration_drop(p.level)
                if dropped_item:
                    p.inventory.append(dropped_item)
                    msg = f"You picked up a {dropped_item}."
                else:
                    # Fallback to gold if no item dropped
                    gold = self.rng.randint(1, 3)
                    p.gold += gold
                    msg = f"You found {gold} gold."
            msg += f" {p.grant_xp(2)}"

        elif choice.lower() in ("trade",):
            if p.gold >= 3:
                p.gold -= 3
                # Better trade rewards using drop system
                trade_item = DROP_SYSTEM.generate_drop(DropSource.CHEST_COMMON, p.level)
                if not trade_item:
                    trade_item = "Potion"  # Fallback
                p.inventory.append(trade_item)
                msg = f"You bought a {trade_item} (-3g). {p.grant_xp(2)}"
            else:
                msg = "Not enough gold to trade."

        elif choice.lower() == "stay":
            # Player chooses to stay in current area
            p.pending = None
            if roll < 0.4:
                # Find something while staying
                if self.rng.random() < 0.6:  # 60% chance for gold
                    gold = self.rng.randint(1, 4)
                    p.gold += gold
                    msg = f"You search the area thoroughly and find {gold} gold."
                else:
                    # 40% chance for item
                    found_item = get_exploration_drop(p.level)
                    if found_item:
                        p.inventory.append(found_item)
                        msg = f"You discover a {found_item} hidden nearby."
                    else:
                        gold = self.rng.randint(1, 2)
                        p.gold += gold
                        msg = f"You find {gold} gold while searching."
                msg += f" {p.grant_xp(1)}"
            else:
                # Nothing found but safe choice
                p.pending = None
                msg = "You decide to explore your current area more. Nothing found, but you feel more familiar with the surroundings."

        elif choice.lower() in ("investigate", "hide", "search"):
            if roll < 0.5:
                p.hp = max(1, p.hp - 2)
                msg = "A creature lunges! -2 HP."
            else:
                # Chance for item instead of just gold
                if self.rng.random() < 0.3:  # 30% chance for item
                    found_item = get_exploration_drop(p.level)
                    if found_item:
                        p.inventory.append(found_item)
                        msg = f"You found a {found_item} in the stash!"
                    else:
                        gold = self.rng.randint(2, 6)
                        p.gold += gold
                        msg = f"You loot a stash: +{gold}g."
                else:
                    gold = self.rng.randint(2, 6)
                    p.gold += gold
                    msg = f"You loot a stash: +{gold}g."
            msg += f" {p.grant_xp(3)}"

        # === ADDITIONAL CHOICE HANDLERS ===
        elif choice.lower() in ("climb", "ascend", "descend"):
            # Risky movement choices
            if roll < 0.3:
                damage = self.rng.randint(1, 3)
                p.hp = max(1, p.hp - damage)
                msg = f"You slip and take {damage} damage while climbing."
            else:
                gold = self.rng.randint(2, 5)
                p.gold += gold
                msg = f"You find a hidden cache with {gold} gold."

        elif choice.lower() in ("help", "comfort", "share"):
            # Good moral choices - small rewards or consequences
            if roll < 0.6:
                heal = min(2, p.max_hp - p.hp)
                p.hp += heal
                msg = "Your kindness is rewarded. You feel refreshed." + (f" +{heal} HP" if heal > 0 else "")
            else:
                msg = "You help as best you can. It feels like the right thing to do."

        elif choice.lower() in ("take", "force"):
            # Aggressive choices - mixed outcomes
            if roll < 0.4:
                gold = self.rng.randint(3, 8)
                p.gold += gold
                msg = f"You forcefully acquire {gold} gold, but feel uneasy about it."
            else:
                damage = self.rng.randint(1, 2)
                p.hp = max(1, p.hp - damage)
                msg = f"Your aggressive approach backfires. -{damage} HP."

        elif choice.lower() in ("rest", "listen", "watch", "admire"):
            # Peaceful choices - minor benefits or flavor
            if roll < 0.4:
                heal = min(1, p.max_hp - p.hp)
                p.hp += heal
                msg = "The peaceful moment restores your spirit." + (f" +{heal} HP" if heal > 0 else "")
            else:
                msg = "You take a moment to appreciate your surroundings. Sometimes the journey is reward enough."

        elif choice.lower() in ("touch", "enter", "breathe_deeply"):
            # Magical/dangerous choices - high risk/reward
            if roll < 0.25:
                # Big reward
                gold = self.rng.randint(5, 12)
                p.gold += gold
                heal = min(3, p.max_hp - p.hp)
                p.hp += heal
                msg = f"Magic surges through you! +{gold} gold, +{heal} HP, {p.grant_xp(4)}."
            elif roll < 0.5:
                # Moderate consequence
                damage = self.rng.randint(2, 4)
                p.hp = max(1, p.hp - damage)
                msg = f"The magic overwhelms you. -{damage} HP."
            else:
                # Nothing happens
                msg = "You sense great power, but nothing happens. Perhaps you're not ready."

        elif choice.lower() in ("ignore", "decline", "refuse", "continue", "pass"):
            # Safe/neutral choices - minimal outcomes
            if roll < 0.2:
                msg = "Your caution proves wise. You notice a small detail others would miss and feel more experienced."
                msg += f" {p.grant_xp(1)}"
            else:
                msg = "You continue on your way without incident. Sometimes discretion is the better part of valor."

        elif choice.lower() in ("flee", "evade", "retreat"):
            # Escape choices - usually safe but no rewards
            msg = "You quickly move away from potential danger. Better safe than sorry."

        elif choice.lower() in ("approach", "confront", "warn_travelers"):
            # Brave choices - higher risk but potential for good rewards
            if roll < 0.3:
                gold = self.rng.randint(4, 8)
                p.gold += gold
                msg = f"Your bravery pays off. +{gold} gold, {p.grant_xp(3)}."
            elif roll < 0.6:
                damage = self.rng.randint(1, 3)
                p.hp = max(1, p.hp - damage)
                msg = f"Your bold approach has consequences. -{damage} HP."
            else:
                msg = "Your courage is noted, but nothing comes of it. Sometimes that's enough."

        else:
            # Default case for any still unhandled choices
            p.pending = None
            msg = "You make your choice and continue forward. The path ahead remains uncertain."

        p.step += 1
        p.pending = None
        return msg

    def start_boss_combat(self, p: "Player") -> str:
        enemy = self.make_boss(p)
        p.combat = {"enemy": enemy}
        p.skill_cd = 0
        # Create Encounter so DoT/indirect kills resolve & reward
        Encounter(self, p, enemy)

        # Use "An" for rarities starting with vowels
        article = "An" if enemy.rarity[0].lower() in "aeiou" else "A"
        boss_options = "Choose: %fight | %skill | %run"
        return f"{article} {enemy.rarity.upper()} BOSS {enemy.name} ({enemy.creature_type}, {enemy.affinity} affinity) appears in {p.location}! HP {enemy.hp}. {boss_options}"

    def start_mob_combat(self, p: "Player") -> str:
        enemy = self.make_mob(p)
        p.combat = {"enemy": enemy}
        p.skill_cd = 0
        # Create Encounter so DoT/indirect kills resolve & reward
        Encounter(self, p, enemy)

        # Show creature type and rarity for interesting encounters
        combat_options = "Choose: %fight | %skill | %run"
        if enemy.rarity in ["epic", "legendary", "mythic"]:
            article = "An" if enemy.rarity[0].lower() in "aeiou" else "A"
            return f"{article} {enemy.rarity.upper()} {enemy.name} ({enemy.creature_type}, {enemy.affinity} affinity) appears in {p.location}! HP {enemy.hp}. {combat_options}"
        else:
            return f"A {enemy.rarity.upper()} {enemy.name} ({enemy.creature_type}) appears in {p.location}! HP {enemy.hp}. {combat_options}"

    def end_combat(self, p: "Player", victory: bool) -> str:
        """
        End combat explicitly (e.g., after %fight/%run). Guarded so rewards are granted once.
        """
        enemy = p.combat["enemy"] if p.combat else None
        enc: Optional[Encounter] = getattr(p, "current_encounter", None)

        if not victory:
            # Retreat/escape path
            if enc and not enc.resolved:
                enc.end()
            else:
                p.combat = None
                p.in_combat = False
            return "You retreat to safety."

        # Victory path – prefer centralized flow so DoT and direct kills match
        if enc:
            already_rewarded = enc.rewarded
            msg = enc.reward_player_once(source="manual")
            enc.end()
            # If we just rewarded now, return that message; otherwise fall back
            if not already_rewarded and msg:
                return msg

        # Fallback if no Encounter present (legacy)
        if not enemy:
            return "The foe has fallen."

        if enemy.type == "boss":
            return self._handle_boss_victory(p, enemy)
        else:
            return self._handle_mob_victory(p, enemy)

    def start_riddle(self, p: "Player") -> str:
        """Start a riddle challenge."""
        # Select random riddler creature
        riddler = self.rng.choice(data.RIDDLERS)
        riddle_text = self.rng.choice(list(data.RIDDLES.keys()))

        p.pending = {
            "type": "riddle",
            "riddle": riddle_text,
            "answer": data.RIDDLES[riddle_text],
            "riddler": riddler,
            "attempts": 0
        }

        # Create atmospheric introduction based on creature type
        intros = {
            "mystic": f"A {riddler['name']} materializes before you, eyes glowing with ancient wisdom.",
            "fey": f"A mischievous {riddler['name']} appears in a shower of sparkles, grinning widely.",
            "spirit": f"The ethereal form of a {riddler['name']} manifests, voice echoing from beyond.",
            "construct": f"An ancient {riddler['name']} awakens, carved runes beginning to glow.",
            "humanoid": f"A mysterious {riddler['name']} emerges from the shadows, stroking a long beard."
        }

        intro = intros.get(riddler["creature_type"], f"A {riddler['name']} blocks your path.")
        return f'{intro} It speaks: "{riddle_text}" Answer with %answer <your_guess>'

    def handle_riddle_answer(self, p: "Player", answer: str) -> str:
        """Handle riddle answer attempt."""
        if not p.pending or p.pending.get("type") != "riddle":
            return "No active riddle. Use %explore to find one."

        riddle_data = p.pending
        riddler = riddle_data["riddler"]
        correct_answer = riddle_data["answer"].lower()
        player_answer = answer.lower().strip()
        riddle_data["attempts"] += 1

        # Check for correct answer (allow some variations)
        if player_answer == correct_answer or player_answer in correct_answer:
            # Correct answer rewards (better rewards for rarer riddlers)
            p.pending = None
            base_xp = 3 + p.level
            base_gold = self.rng.randint(5, 15)

            # Bonus for rarer riddlers
            rarity_multiplier = {"uncommon": 1.0, "rare": 1.3, "epic": 1.6}.get(riddler["rarity"], 1.0)
            xp_reward = int(base_xp * rarity_multiplier)
            gold_reward = int(base_gold * rarity_multiplier)

            p.gold += gold_reward
            xp_msg = p.grant_xp(xp_reward)

            return f'Correct! The answer was "{correct_answer}". The {riddler["name"]} rewards your wisdom. +{gold_reward}g, {xp_msg}.'

        elif riddle_data["attempts"] >= 2:
            # Failed after 2 attempts
            p.pending = None
            return f'Wrong again! The answer was "{correct_answer}". The {riddler["name"]} lets you pass, disappointed.'

        else:
            # First wrong attempt, allow retry
            return f'Wrong! The {riddler["name"]} looks displeased. You have one more chance. Answer with %answer <guess>'

    def travel_to_new_area(self, p: "Player") -> str:
        """Handle area travel choice."""
        current_location = p.location

        # Get available locations (all except current)
        available_locations = [loc for loc in data.START_LOCATIONS if loc != current_location]
        new_location = self.rng.choice(available_locations)

        # Clear pending event
        p.pending = None

        # Move player
        old_location = p.location
        p.location = new_location

        # Small XP reward for exploration
        xp_reward = 1 + (p.level // 3)
        xp_msg = p.grant_xp(xp_reward)

        return f"You travel from {old_location} to {new_location}. New area discovered! {xp_msg}"

    def _handle_boss_victory(self, p: "Player", enemy: "Enemy") -> str:
        """Handle boss kill rewards with new drop system."""
        # Gold reward
        gold = self.rng.randint(8, 16)
        xp = self.rng.randint(10, 16)
        p.gold += gold

        # Primary drop (guaranteed)
        primary_drop = get_boss_drop(p.level)
        drops = []
        if primary_drop:
            p.inventory.append(primary_drop)
            drops.append(primary_drop)

        # Chance for additional drops
        if self.rng.random() < DropConfig.BOSS_MULTI_DROP_CHANCE:
            secondary_drop = get_boss_drop(p.level)
            if secondary_drop and secondary_drop != primary_drop:
                p.inventory.append(secondary_drop)
                drops.append(secondary_drop)

        # Very rare chance for third drop
        if self.rng.random() < DropConfig.BOSS_RARE_MULTI_DROP_CHANCE:
            tertiary_drop = get_boss_drop(p.level)
            if tertiary_drop and tertiary_drop not in drops:
                p.inventory.append(tertiary_drop)
                drops.append(tertiary_drop)

        # Format drop message
        if len(drops) == 1:
            drop_msg = f"found {drops[0]}"
        elif len(drops) == 2:
            drop_msg = f"found {drops[0]} and {drops[1]}"
        else:
            drop_msg = f"found {', '.join(drops[:-1])}, and {drops[-1]}"

        return f"Boss defeated! +{gold}g, {drop_msg}, {p.grant_xp(xp)}."

    def _handle_mob_victory(self, p: "Player", enemy: "Enemy") -> str:
        """Handle mob kill rewards with new drop system."""
        # Gold reward
        gold = self.rng.randint(2, 7)
        xp = self.rng.randint(4, 8)
        p.gold += gold

        # Item drop using new system
        dropped_item = get_mob_drop(p.level)
        if dropped_item:
            p.inventory.append(dropped_item)
            return f"Foe defeated! +{gold}g, found a {dropped_item}, {p.grant_xp(xp)}."
        else:
            return f"Foe defeated! +{gold}g, {p.grant_xp(xp)}."

    def run_guard_autovictory(self, p: "Player", tag: str = "") -> Optional[str]:
            """
            If enemy is already dead when the player tries to %run, resolve victory
            and return the spoils line. Otherwise return None.
            """
            msg = _encounter_autoresolve_victory(p, source="run_guard")
            if msg:
                prefix = f"{tag} " if tag else ""
                return f"{prefix}{msg}"
            return None
    
    def explore_guard_autovictory(self, p: "Player", tag: str = "") -> Optional[str]:
        """
        If in combat but the enemy is already dead, resolve victory and return None
        so exploration can proceed. If still alive, return the standard 'in combat' line.
        """
        if not getattr(p, "combat", None):
            return None  # not in combat → exploration may proceed

        enemy = p.combat.get("enemy")
        if enemy and enemy.hp <= 0:
            _encounter_autoresolve_victory(p, source="explore_guard")
            return None  # cleared; let caller continue into exploration

        prefix = f"{tag} " if tag else ""
        return f"{prefix}in combat! Use %fight/%skill/%run."
    
    # ---- turn system ----
    def after_round(self, p: "Player") -> None:
        if p.skill_cd > 0:
            p.skill_cd -= 1

    def enemy_turn(self, p: "Player", e: "Enemy") -> str:
        out = []
        if e.type == "boss" and not e.enraged and e.hp <= int(e.max_hp * 0.3):
            e.enraged = True
            out.append("It becomes ENRAGED! (+50% attack)")

        # Status effects on enemy (DoTs, etc.). These should call apply_damage on the enemy.
        out += e.apply_statuses()
        if e.hp <= 0:
            # If a DoT killed the enemy, Encounter will have rewarded/ended already.
            return " ".join(out)

        atk = e.atk
        if e.type == "boss" and e.enraged:
            atk = int(atk * 1.5)

        # Rogue dodge ability
        if p.clazz == "rogue" and self.rng.random() < 0.20:
            out.append("You dodge the attack!")
        else:
            dmg = atk + self.rng.randint(0, 2)

            # Apply intimidation effect (scaled by level and rarity)
            if hasattr(e, 'has_intimidating_presence') and e.has_intimidating_presence():
                enemy_level = max(1, (e.max_hp - 5) // 3)
                rarity_bonus = {
                    "common": 1.0, "rare": 1.2, "epic": 1.4,
                    "legendary": 1.6, "mythic": 1.8
                }.get(getattr(e, 'rarity', 'common'), 1.0)

                base_chance = 0.20 + (enemy_level * 0.015)  # 20% base + 1.5% per level
                scaled_chance = min(base_chance * rarity_bonus, 0.5)  # Cap at 50%

                if self.rng.random() < scaled_chance:
                    damage_reduction = 0.25 + (enemy_level * 0.01)  # 25% base + 1% per level
                    scaled_reduction = min(damage_reduction * rarity_bonus, 0.6)  # Cap at 60%
                    dmg = int(dmg * (1 - scaled_reduction))
                    apply_damage(p, dmg, source="enemy_intimidating_hit")
                    out.append(f"You're intimidated by the {e.rarity} {e.name}! Damage reduced to {dmg}.")
                else:
                    apply_damage(p, dmg, source="enemy_hit")
                    out.append(f"The {e.name} hits you for {dmg} with a terrifying roar!")
            else:
                apply_damage(p, dmg, source="enemy_hit")
                out.append(f"The {e.name} hits you for {dmg}.")

            # Apply trait-based status effects on hit (scaled by level and rarity)
            if hasattr(e, 'can_inflict_status'):
                # Calculate scaling factors
                enemy_level = max(1, (e.max_hp - 5) // 3)
                rarity_bonus = {
                    "common": 1.0, "rare": 1.2, "epic": 1.4,
                    "legendary": 1.6, "mythic": 1.8
                }.get(getattr(e, 'rarity', 'common'), 1.0)

                if e.can_inflict_status("poison"):
                    base_chance = 0.25 + (enemy_level * 0.01)
                    scaled_chance = min(base_chance * rarity_bonus, 0.6)
                    if self.rng.random() < scaled_chance:
                        duration = int((2 + enemy_level * 0.2) * rarity_bonus)
                        p.statuses["poison"] = p.statuses.get("poison", 0) + duration
                        out.append(f"You feel {enemy_level}-potent poison coursing through your veins!")

                if e.can_inflict_status("burn"):
                    base_chance = 0.20 + (enemy_level * 0.01)
                    scaled_chance = min(base_chance * rarity_bonus, 0.5)
                    if self.rng.random() < scaled_chance:
                        duration = int((2 + enemy_level * 0.15) * rarity_bonus)
                        p.statuses["burn"] = p.statuses.get("burn", 0) + duration
                        out.append(f"You catch magical fire that burns for {duration} turns!")

                if e.can_inflict_status("bleed"):
                    base_chance = 0.30 + (enemy_level * 0.015)
                    scaled_chance = min(base_chance * rarity_bonus, 0.65)
                    if self.rng.random() < scaled_chance:
                        duration = int((2 + enemy_level * 0.1) * rarity_bonus)
                        p.statuses["bleed"] = p.statuses.get("bleed", 0) + duration
                        out.append(f"You're bleeding from {duration}-turn wounds!")

        # Boss special abilities every 3 rounds
        if e.type == "boss":
            e.special_cd += 1
            if e.special_cd >= 3:
                out.append(self.boss_special(e, p))
                e.special_cd = 0

        return " ".join(out)

    def boss_special(self, e: "Enemy", p: "Player") -> str:
        move = self.rng.choice(["smash", "roar", "guard"])
        if move == "smash":
            dmg = e.atk + self.rng.randint(2, 5)
            apply_damage(p, dmg, source="boss_smash")
            return f"The {e.name} unleashes a crushing smash for {dmg}!"
        if move == "roar":
            e.armor += 1
            return f"The {e.name} roars, its hide hardens (+1 armor)."
        # guard
        heal = min(5, e.max_hp - e.hp) if e.hp < e.max_hp else 0
        e.hp += heal
        e.armor += 1
        return f"The {e.name} guards, recovers {heal} HP and +1 armor."

    # ---- New utility methods for drop system ----
    def get_drop_preview(self, source_type: str, player_level: int = 1) -> Dict:
        """Get drop rate preview for a given source (for admin/testing)."""
        source_map = {
            "mob": DropSource.MOB_KILL,
            "boss": DropSource.BOSS_KILL,
            "explore": DropSource.EXPLORATION
        }

        if source_type not in source_map:
            return {"error": "Invalid source type"}

        return DROP_SYSTEM.get_drop_statistics(source_map[source_type], player_level)
    
    def simulate_drops(self, source_type: str, count: int = 100, player_level: int = 1) -> Dict:
        """Simulate drops for testing balance."""
        source_map = {
            "mob": DropSource.MOB_KILL,
            "boss": DropSource.BOSS_KILL,
            "explore": DropSource.EXPLORATION
        }

        if source_type not in source_map:
            return {"error": "Invalid source type"}

        drops = []
        for _ in range(count):
            if source_type == "mob":
                drop = get_mob_drop(player_level)
            elif source_type == "boss":
                drop = get_boss_drop(player_level)
            else:
                drop = get_exploration_drop(player_level)

            if drop:
                drops.append(drop)

        # Count occurrences
        drop_counts = {}
        for drop in drops:
            drop_counts[drop] = drop_counts.get(drop, 0) + 1

        return {
            "total_drops": len(drops),
            "no_drop_count": count - len(drops),
            "drop_distribution": drop_counts,
            "drop_rate": f"{(len(drops)/count)*100:.1f}%"
        }