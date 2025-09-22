# game/models.py
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, TYPE_CHECKING
import random
from . import data
from .items import ItemType, ItemSubType  
from server.adapter import emit



@dataclass
class Enemy:
    name: str
    hp: int
    max_hp: int
    atk: int
    armor: int
    type: str  # "mob" | "boss"
    round: int = 1
    turn: str = "player"
    enraged: bool = False
    special_cd: int = 0
    traits: List[str] = field(default_factory=list)
    statuses: Dict[str, int] = field(default_factory=dict)
    
    # Creature classification
    creature_type: str = "beast"  # beast, undead, elemental, demon, dragon, construct, etc.
    affinity: str = "neutral"     # fire, ice, darkness, light, void, divine, nature, etc.
    rarity: str = "common"        # common, rare, epic, legendary, mythic
    
    # Resistances
    fire_resist: int = 0
    cold_resist: int = 0
    magic_resist: int = 0
    
    # Vulnerabilities (take extra damage from these types)
    vulnerabilities: List[str] = field(default_factory=list)

    # ---- Identity & encounter backrefs / rewards (safe defaults) ----
    is_enemy: bool = True
    current_encounter: Optional[object] = None  # set by Encounter
    # rewards used by Encounter.reward_player_once
    gold_reward: int = 0
    xp_reward: int = 0

    def to_json(self) -> Dict:
        return asdict(self)

    @staticmethod
    def from_json(d: Dict) -> "Enemy":
        return Enemy(**d)

    def apply_statuses(self) -> List[str]:
        """Apply all status effect ticks and return messages. DoT goes via apply_damage()."""
        # Local import to avoid circular dependency at module import time
        from .engine import apply_damage

        out = []
        
        # Regeneration (mob trait) – healing stays direct
        if self.type == "mob":
            if "regen" in self.traits and self.hp < self.max_hp:
                self.hp = min(self.max_hp, self.hp + 1)
                out.append("It regenerates 1 HP.")
        
        # Damage over time effects (use centralized damage to trigger death/reward)
        if self.statuses.get("bleed"):
            damage = 2
            apply_damage(self, damage, source="bleed")
            self.statuses["bleed"] -= 1
            if self.statuses["bleed"] <= 0:
                self.statuses.pop("bleed", None)
                out.append("Bleeding wears off.")
            out.append(f"It bleeds for {damage} damage.")
        
        if self.statuses.get("burn"):
            damage = 3
            apply_damage(self, damage, source="burn")
            self.statuses["burn"] -= 1
            if self.statuses["burn"] <= 0:
                self.statuses.pop("burn", None)
                out.append("Burning fades.")
            out.append(f"It burns for {damage} damage.")
        
        if self.statuses.get("poison"):
            damage = 2
            apply_damage(self, damage, source="poison")
            self.statuses["poison"] -= 1
            if self.statuses["poison"] <= 0:
                self.statuses.pop("poison", None)
                out.append("Poison wears off.")
            out.append(f"It takes {damage} poison damage.")
        
        # Control effects
        if self.statuses.get("stunned"):
            self.statuses["stunned"] -= 1
            if self.statuses["stunned"] <= 0:
                self.statuses.pop("stunned", None)
                out.append("Stun wears off.")
            out.append("It is stunned and cannot act.")
        
        if self.statuses.get("frozen"):
            self.statuses["frozen"] -= 1
            if self.statuses["frozen"] <= 0:
                self.statuses.pop("frozen", None)
                out.append("Frozen state ends.")
            out.append("It is frozen solid.")
        
        if self.statuses.get("intimidated"):
            self.statuses["intimidated"] -= 1
            if self.statuses["intimidated"] <= 0:
                self.statuses.pop("intimidated", None)
                out.append("It regains its resolve.")
            out.append("It cowers in fear.")
        
        return out

    def get_dodge_chance(self) -> int:
        """Calculate enemy dodge chance based on traits, level, and rarity."""
        base_dodge = 0
        
        # Get level for scaling (estimate from HP if not stored)
        enemy_level = max(1, (self.max_hp - 5) // 3)  # Rough level estimate
        
        # Rarity multipliers for trait effectiveness
        rarity_bonus = {
            "common": 1.0, "rare": 1.2, "epic": 1.4, 
            "legendary": 1.6, "mythic": 1.8
        }.get(getattr(self, 'rarity', 'common'), 1.0)
        
        if "evasive" in self.traits:
            trait_dodge = 20 + (enemy_level * 1.5)  # 20% base + 1.5% per level
            base_dodge += int(trait_dodge * rarity_bonus)
        
        if "phase_shift" in self.traits:
            trait_dodge = 12 + (enemy_level * 1)  # 12% base + 1% per level
            base_dodge += int(trait_dodge * rarity_bonus)
        
        return min(base_dodge, 65)  # Cap at 65% for balance
    
    def get_armor_bonus(self) -> int:
        """Calculate bonus armor from traits, level, and rarity."""
        bonus = 0
        
        # Get level and rarity scaling
        enemy_level = max(1, (self.max_hp - 5) // 3)
        rarity_bonus = {
            "common": 1.0, "rare": 1.2, "epic": 1.4, 
            "legendary": 1.6, "mythic": 1.8
        }.get(getattr(self, 'rarity', 'common'), 1.0)
        
        if "shell" in self.traits:
            trait_armor = 2 + (enemy_level * 0.3)  # 2 base + 0.3 per level
            bonus += int(trait_armor * rarity_bonus)
        
        if "stone_skin" in self.traits:
            trait_armor = 3 + (enemy_level * 0.4)  # 3 base + 0.4 per level
            bonus += int(trait_armor * rarity_bonus)
        
        if "ice_armor" in self.traits:
            trait_armor = 2 + (enemy_level * 0.25)  # 2 base + 0.25 per level
            bonus += int(trait_armor * rarity_bonus)
        
        return bonus
    
    def get_effective_armor(self) -> int:
        """Get total armor including trait bonuses."""
        return self.armor + self.get_armor_bonus()
    
    def has_intimidating_presence(self) -> bool:
        """Check if enemy has intimidating traits."""
        return any(trait in self.traits for trait in ["intimidate", "fear", "terrifying"])
    
    def can_inflict_status(self, status: str) -> bool:
        """Check if enemy can inflict status effects based on traits."""
        status_traits = {
            "poison": ["poison", "poison_tail", "venomous"],
            "burn": ["burn", "fire_breath", "flame_aura"],
            "freeze": ["freeze", "ice_breath", "frost_aura"],
            "bleed": ["bleed", "sharp_claws", "rend"]
        }
        return any(trait in self.traits for trait in status_traits.get(status, []))


@dataclass
class Player:
    name: str
    location: str
    level: int = 1
    xp: int = 0
    xp_to_next: int = 10
    max_hp: int = data.BASE_MAX_HP
    hp: int = data.BASE_MAX_HP
    gold: int = 0
    clazz: Optional[str] = None
    inventory: List[str] = field(default_factory=lambda: ["Potion"])
    pending: Optional[Dict] = None
    combat: Optional[Dict] = None  # {"enemy": Enemy}
    skill_cd: int = 0
    step: int = 0

    # ---- Identity & encounter state ----
    is_player: bool = True
    in_combat: bool = False
    current_encounter: Optional[object] = None  # set by Encounter
    
    # Equipment slots
    equipped: Dict[str, Optional[str]] = field(default_factory=lambda: {
        "headgear": None,
        "armor": None,
        "legs": None,
        "footwear": None,
        "hands": None,
        "cape": None,
        "off_hand": None,
        "amulet": None,
        "ring1": None,
        "ring2": None,
        "belt": None,
        "main_hand": None,
        "flavor1": None,  # Shared trinket/relic slots
        "flavor2": None,
        "flavor3": None
    })
    
    # === ENHANCED STATS FOR EFFECTS ===
    # Basic combat stats
    damage_bonus: int = 0
    armor_bonus: int = 0
    dodge_bonus: int = 0
    crit_chance: int = 0
    block_chance: int = 0
    
    # Magic stats
    mana: int = 0
    max_mana: int = 50
    mana_regen: int = 0
    spell_power: int = 0
    magic_damage_bonus: int = 0
    
    # Resistances
    fire_resist: int = 0
    cold_resist: int = 0
    magic_resist: int = 0
    void_protection: int = 0
    
    # Special abilities
    life_steal: int = 0
    armor_pierce: int = 0
    pierce: int = 0
    heal_on_kill: int = 0
    escape_bonus: int = 0
    luck_bonus: int = 0
    regen: int = 0
    
    # Temporary buffs
    temp_damage_buff: int = 0
    temp_damage_duration: int = 0
    temp_armor_debuff: int = 0
    temp_armor_debuff_duration: int = 0
    speed_buff: int = 0
    speed_duration: int = 0
    
    # Status effects
    statuses: Dict[str, int] = field(default_factory=dict)
    stealth_turns: int = 0
    immortal_turns: int = 0
    divine_shield: int = 0
    extra_turns: int = 0
    
    # Special powers (rare/legendary/mythic)
    resurrect_charges: int = 0
    true_immortal: bool = False
    ascended: bool = False
    divine_power: int = 0
    cosmic_power: bool = False
    omnipotent: bool = False
    reality_control: bool = False
    time_control: bool = False
    time_master: bool = False
    star_control: bool = False
    multiverse_control: bool = False
    infinite_knowledge: bool = False
    infinite_regen: bool = False
    energy_body: bool = False
    ancient_wisdom: bool = False
    can_fly: bool = False
    detect_lies: bool = False
    night_vision: bool = False
    matter_creation: bool = False
    dimensional_power: bool = False
    
    # Utility stats
    grip_strength: int = 0
    kick_damage: int = 0
    punch_damage: int = 0
    stun_chance: int = 0
    reflect_chance: int = 0
    phase_shift_chance: int = 0
    stealth_bonus: int = 0
    energy_absorb: int = 0
    hp_drain_per_turn: int = 0
    
    # Tracking stats
    worlds_created: int = 0
    stat_bonus: int = 0
    summoned_ally: Optional[Dict] = None

    def to_json(self) -> Dict:
        j = asdict(self)
        if self.combat and self.combat.get("enemy"):
            j["combat"]["enemy"] = self.combat["enemy"].to_json()
        return j

    @staticmethod
    def from_json(d: Dict) -> "Player":
        if d.get("combat") and d["combat"].get("enemy") and not isinstance(d["combat"]["enemy"], Enemy):
            d["combat"]["enemy"] = Enemy.from_json(d["combat"]["enemy"])
        return Player(**d)

    # ---- progression ----
    def level_up(self) -> str:
        self.level += 1
        self.xp = 0
        self.xp_to_next = 10 + (self.level - 1) * 6
        hp_gain = 2 + (1 if self.clazz == "warrior" else 0)
        self.max_hp += hp_gain
        self.hp = self.max_hp
        emit(self, "levelup", {"level": int(self.level)})
        return f"Level {self.level}! Max HP +{hp_gain}. Fully healed."

    def grant_xp(self, amount: int) -> str:
        msgs = []
        self.xp += amount
        msgs.append(f"+{amount} XP")
        while self.xp >= self.xp_to_next:
            self.xp -= self.xp_to_next
            msgs.append(self.level_up())
        return " — ".join(msgs)

    # Compatibility shim for systems expecting gain_xp(...)
    def gain_xp(self, amount: int):
        return self.grant_xp(amount)

    # ---- enhanced combat helpers ----
    def get_total_damage(self) -> int:
        """Calculate total damage including all bonuses."""
        base = 1 + (self.level // 2)
        bonus = self.damage_bonus + self.temp_damage_buff + self.stat_bonus
        if self.ascended:
            bonus += 50  # Massive damage bonus for ascended players
        return base + bonus
    
    def get_total_armor(self) -> int:
        """Calculate total armor including all bonuses."""
        base = 0
        bonus = self.armor_bonus + self.stat_bonus - self.temp_armor_debuff
        if self.energy_body:
            bonus += 25  # Energy body provides natural armor
        return max(0, base + bonus)
    
    def get_spell_power(self) -> int:
        """Calculate total spell power including class bonuses."""
        base_power = self.spell_power
        
        # Mage passive: +1 spell potency per level
        if self.clazz == "mage":
            base_power += self.level
        
        return base_power
    
    def get_magic_damage_bonus(self) -> int:
        """Calculate total magic damage bonus including spell power."""
        return self.magic_damage_bonus + self.get_spell_power()
    
    def get_equipped_items(self) -> List[str]:
        """Get list of all equipped items."""
        return [item for item in self.equipped.values() if item is not None]
    
    def calculate_equipped_bonuses(self) -> Dict[str, int]:
        """Calculate all bonuses from currently equipped items only."""
        bonuses = {
            "damage": 0, "armor": 0, "dodge": 0, "crit_chance": 0,
            "spell_power": 0, "magic_damage": 0, "life_steal": 0,
            "fire_resist": 0, "cold_resist": 0, "magic_resist": 0
        }
        # Intentionally no imports here; effects applied elsewhere
        # and recomputed by _recompute_equipment_effects().
        return bonuses
    
    def get_available_slot_for_item(self, item_sub_type: str) -> Optional[str]:
        """Find available slot for an item sub-type."""
        # Map sub-types to slot names
        slot_mapping = {
            "headgear": ["headgear"],
            "armor": ["armor"],
            "legs": ["legs"],
            "footwear": ["footwear"],
            "hands": ["hands"],
            "cape": ["cape"],
            "off-hand": ["off_hand"],
            "amulet": ["amulet"],
            "ring": ["ring1", "ring2"],
            "belt": ["belt"],
            "main-hand": ["main_hand"],
            "trinket": ["flavor1", "flavor2", "flavor3"],
            "relic": ["flavor1", "flavor2", "flavor3"],
            "consumable": [],  # Can't be equipped
            "material": []     # Can't be equipped
        }
        
        possible_slots = slot_mapping.get(item_sub_type, [])
        for slot in possible_slots:
            if self.equipped.get(slot) is None:
                return slot
        return None

    # Effect types that are safe to (re)apply from equipment every time.
    _EQUIP_EFFECT_WHITELIST = {
        "damage", "armor", "dodge", "crit_chance", "block_chance",
        "life_steal", "pierce", "armor_pierce", "true_strike",
        "spell_power", "magic_damage",
        "fire_resist", "cold_resist", "magic_resist",
        "all_resist", "void_protection",
        "stealth", "stealth_bonus", "night_vision",
        "detect_lies", "flight", "reflect",
        "phase_shift", "phase_shift_chance", "mana_regen",
        "grip", "kick_damage", "punch_damage", "stun_chance",
        "undead_damage", "light_damage", "lightning_damage",
        "ice_damage", "fire_damage", "earth_damage",
        "void_damage", "divine_damage",
    }

    _EQUIP_BASELINE = {
        "damage_bonus": 0,
        "armor_bonus": 0,
        "dodge_bonus": 0,
        "crit_chance": 0,
        "block_chance": 0,
        "life_steal": 0,
        "pierce": 0,
        "armor_pierce": 0,
        "magic_damage_bonus": 0,
        "spell_power": 0,
        "mana_regen": 0,
        "reflect_chance": 0,
        "phase_shift_chance": 0,
        "stealth_bonus": 0,
        "fire_resist": 0,
        "cold_resist": 0,
        "magic_resist": 0,
        "void_protection": 0,
        "grip_strength": 0,
        "kick_damage": 0,
        "punch_damage": 0,
        "stun_chance": 0,
        "true_strike": False,
        "can_fly": False,
        "detect_lies": False,
        "night_vision": False,
    }

    def _clear_equipment_bonuses(self) -> None:
        for attr, default in self._EQUIP_BASELINE.items():
            setattr(self, attr, default)

    def _recompute_equipment_effects(self) -> None:
        self._clear_equipment_bonuses()
        # Lazy imports to avoid cycles
        from .items import get_item
        from .effects import EFFECT_PROCESSOR as _EFFECT_PROCESSOR
        for slot, name in self.equipped.items():
            if not name:
                continue
            item = get_item(name)
            if not item:
                continue
            for eff in item.effects:
                if eff.type in self._EQUIP_EFFECT_WHITELIST:
                    _EFFECT_PROCESSOR.apply_effect(eff.type, eff.value, self, None, eff.duration)

    def _slots_for_subtype(self, sub_type: str) -> list[str]:
        mapping = {
            "headgear": ["headgear"],
            "armor": ["armor"],
            "legs": ["legs"],
            "footwear": ["footwear"],
            "hands": ["hands"],
            "cape": ["cape"],
            "main-hand": ["main_hand"],
            "off-hand": ["off_hand"],
            "amulet": ["amulet"],
            "belt": ["belt"],
            "ring": ["ring1", "ring2"],
            "trinket": ["flavor1", "flavor2", "flavor3"],
            "relic": ["flavor1", "flavor2", "flavor3"],
        }
        return mapping.get(sub_type, [])

    def equip_item(self, item_name: str) -> tuple[bool, str]:
        # Lazy import to avoid pulling items (and its deps) at module import time
        from .items import get_item
        name = (item_name or "").strip()
        item = get_item(name.lower())
        if not item:
            return False, f"'{item_name}' is not a known item."

        if item.name not in self.inventory:
            return False, f"You don't have {item.name}."

        if item.type == ItemType.CONSUMABLE or item.sub_type in (ItemSubType.CONSUMABLE, ItemSubType.MATERIAL):
            return False, f"{item.name} can't be equipped."

        slots = self._slots_for_subtype(item.sub_type.value)
        if not slots:
            return False, f"{item.name} can't be equipped (no valid slot)."

        target = None
        for s in slots:
            if not self.equipped.get(s):
                target = s
                break
        if not target:
            target = slots[0]

        for s, equipped_name in self.equipped.items():
            if equipped_name == item.name:
                return False, f"{item.name} is already equipped in {s}."

        swapped_out = None
        if self.equipped.get(target):
            swapped_out = self.equipped[target]
            self.inventory.append(swapped_out)

        self.inventory.remove(item.name)
        self.equipped[target] = item.name

        self._recompute_equipment_effects()

        if swapped_out:
            return True, f"Equipped {item.name} in {target} (swapped out {swapped_out})."
        return True, f"Equipped {item.name} in {target}."

    def unequip_item(self, item_or_slot: str) -> tuple[bool, str]:
        query = (item_or_slot or "").strip().lower()
        if not query:
            return False, "Specify a slot or item to unequip."

        slot = None
        if query in self.equipped:
            slot = query
        else:
            for s, name in self.equipped.items():
                if name and name.lower() == query:
                    slot = s
                    break

        if not slot:
            return False, f"Nothing equipped for '{item_or_slot}'."

        if not self.equipped.get(slot):
            return False, f"{slot} is already empty."

        removed = self.equipped[slot]
        self.equipped[slot] = None
        self.inventory.append(removed)

        self._recompute_equipment_effects()
        return True, f"Unequipped {removed} from {slot}."
    
    def get_dodge_chance(self) -> int:
        base = 20 if self.clazz == "rogue" else 0
        bonus = self.dodge_bonus + self.stat_bonus
        if self.can_fly:
            bonus += 30
        if self.energy_body:
            bonus += 20
        return min(95, base + bonus)
    
    def take_damage(self, amount: int) -> int:
        if self.true_immortal:
            return 0
        
        if self.immortal_turns > 0:
            self.immortal_turns -= 1
            return 0
        
        if self.divine_shield > 0:
            absorbed = min(self.divine_shield, amount)
            self.divine_shield -= absorbed
            amount -= absorbed
            if amount <= 0:
                return absorbed
        
        if hasattr(self, 'immunity') and self.immunity > 0:
            amount = int(amount * (1 - self.immunity / 100))
        
        actual_damage = max(0, amount)
        old_hp = self.hp
        self.hp = max(0, self.hp - actual_damage)
        
        if self.hp <= 0 and self.resurrect_charges > 0:
            self.resurrect_charges -= 1
            self.hp = self.max_hp
            return f"RESURRECTED! ({self.resurrect_charges} charges left)"
        
        return old_hp - self.hp

    def apply_turn_effects(self) -> List[str]:
        messages = []
        
        # Regeneration
        if self.infinite_regen:
            if self.hp < self.max_hp:
                self.hp = self.max_hp
                messages.append("INFINITE REGEN: Fully healed")
        elif self.regen > 0:
            heal = min(self.regen, self.max_hp - self.hp)
            self.hp += heal
            if heal > 0:
                messages.append(f"Regenerated {heal} HP")
        
        # Mana regeneration
        if self.mana_regen > 0 and self.mana < self.max_mana:
            mana_gain = min(self.mana_regen, self.max_mana - self.mana)
            self.mana += mana_gain
            if mana_gain > 0:
                messages.append(f"Regenerated {mana_gain} mana")
        
        # HP drain effects (non-status gear drain; leaves players at 1 HP)
        if self.hp_drain_per_turn > 0:
            drain = min(self.hp_drain_per_turn, max(0, self.hp - 1))
            self.hp -= drain
            if drain > 0:
                messages.append(f"Lost {drain} HP to dark power")
        
        # Decrease temporary effect durations
        if self.temp_damage_duration > 0:
            self.temp_damage_duration -= 1
            if self.temp_damage_duration <= 0:
                self.temp_damage_buff = 0
                messages.append("Damage buff expired")
        
        if self.temp_armor_debuff_duration > 0:
            self.temp_armor_debuff_duration -= 1
            if self.temp_armor_debuff_duration <= 0:
                self.temp_armor_debuff = 0
                messages.append("Armor penalty expired")
        
        if self.stealth_turns > 0:
            self.stealth_turns -= 1
            if self.stealth_turns <= 0:
                messages.append("Stealth wears off")
        
        if self.immortal_turns > 0:
            self.immortal_turns -= 1
            if self.immortal_turns <= 0:
                messages.append("Immortality expires")
        
        return messages

    def use_skill(self, enemy: Enemy) -> str:
        """Enhanced skill system with effect bonuses."""
        cls = self.clazz
        if not cls:
            return "No class selected"
        
        # Calculate enhanced damage with bonuses
        base_damage = self.get_total_damage()
        spell_bonus = self.spell_power // 10 if hasattr(self, 'spell_power') else 0
        
        if cls == "warrior":
            if random.random() < 0.65:
                dmg = random.randint(3, 6) + self.level + spell_bonus
                # Apply armor piercing
                if hasattr(self, 'armor_pierce'):
                    effective_armor = max(0, enemy.armor - self.armor_pierce)
                else:
                    effective_armor = enemy.armor
                final_dmg = max(1, dmg - effective_armor)
                enemy.hp = max(0, enemy.hp - final_dmg)
                msg = f"Power Strike pierces for {final_dmg}!"
                
                # Apply life steal
                if hasattr(self, 'life_steal') and self.life_steal > 0:
                    heal = min(self.life_steal, self.max_hp - self.hp)
                    self.hp += heal
                    if heal > 0:
                        msg += f" (Life steal: +{heal} HP)"
            else:
                msg = "Power Strike misses!"
            self.skill_cd = 3
            
        elif cls == "mage":
            spell_power = self.get_spell_power()
            # Fire Bolt ignores half the armor (rounded up)
            raw = 2 + self.level + self.get_magic_damage_bonus()
            
            total_armor = enemy.get_effective_armor() if hasattr(enemy, 'get_effective_armor') else enemy.armor
            import math
            armor_ignored = math.ceil(total_armor / 2)  # Half armor rounded up
            effective_armor = max(0, total_armor - armor_ignored)
            dmg = max(1, raw - effective_armor)
            enemy.hp = max(0, enemy.hp - dmg)
            
            if spell_power > 0:
                msg = f"Fire Bolt sears for {dmg} (ignores {armor_ignored}/{total_armor} armor, +{spell_power} spell power)!"
            else:
                msg = f"Fire Bolt sears for {dmg} (ignores {armor_ignored}/{total_armor} armor)!"
            
            # Chance to burn (increases with spell power)
            burn_chance = 0.3 + (spell_power * 0.02)  # Base 30% + 2% per spell power
            if random.random() < burn_chance:
                burn_duration = 2 + (spell_power // 3)  # Longer burns with more spell power
                enemy.statuses["burn"] = enemy.statuses.get("burn", 0) + burn_duration
                msg += f" Target catches fire for {burn_duration} turns!"
            self.skill_cd = 2
            
        elif cls == "rogue":
            high = enemy.hp > enemy.max_hp * 0.5
            base = 1 + self.level + spell_bonus
            
            # Enhanced crit chance for rogues
            crit_chance = 0.6 if high else 0.3
            if hasattr(self, 'crit_chance'):
                crit_chance += self.crit_chance / 100
            
            if random.random() < crit_chance:
                dmg = base + random.randint(3, 5) + self.damage_bonus
                msg = f"Backstab CRITS for {dmg}!"
                
                # Apply bleeding
                if "Enchanted Dagger" in self.inventory or hasattr(self, 'bleed_on_crit'):
                    enemy.statuses["bleed"] = enemy.statuses.get("bleed", 0) + 3
                    msg += " Target starts bleeding!"
            else:
                dmg = base + random.randint(0, 2) + self.damage_bonus
                msg = f"Backstab hits for {dmg}."
            
            enemy.hp = max(0, enemy.hp - dmg)
            self.skill_cd = 3
        else:
            dmg = self.get_total_damage()
            enemy.hp = max(0, enemy.hp - dmg)
            msg = f"You strike for {dmg}."
            
        return msg

    def basic_hit(self, enemy: Enemy) -> str:
        """Enhanced basic attack with all effect bonuses."""
        total_damage = self.get_total_damage()
        
        crit_chance = getattr(self, 'crit_chance', 0) / 100
        is_crit = random.random() < crit_chance
        if is_crit:
            total_damage = int(total_damage * 1.5)
            crit_msg = " CRITICAL HIT!"
        else:
            crit_msg = ""
        
        enemy_dodge = enemy.get_dodge_chance() if hasattr(enemy, 'get_dodge_chance') else 0
        player_dodge_reduction = getattr(self, 'true_strike', False)
        
        if not player_dodge_reduction and enemy_dodge > 0:
            if random.random() * 100 < enemy_dodge:
                return f"Your attack misses! The {enemy.name} dodges with evasive grace."
        
        enemy_armor = enemy.get_effective_armor() if hasattr(enemy, 'get_effective_armor') else enemy.armor
        effective_armor = max(0, enemy_armor - getattr(self, 'armor_pierce', 0))
        final_damage = max(1, total_damage - effective_armor)
        
        enemy.hp = max(0, enemy.hp - final_damage)
        
        hit_effects = []
        if "Enchanted Dagger" in self.inventory and random.random() < 0.15 and enemy.type == "mob":
            enemy.statuses["bleed"] = enemy.statuses.get("bleed", 0) + 2
            hit_effects.append("bleeding applied")
        
        if hasattr(self, 'life_steal') and self.life_steal > 0:
            steal = min(self.life_steal, final_damage, self.max_hp - self.hp)
            if steal > 0:
                self.hp += steal
                hit_effects.append(f"stole {steal} HP")
        
        msg = f"You hit for {final_damage}{crit_msg}."
        if hit_effects:
            msg += f" ({', '.join(hit_effects)})"
        
        return msg

    def process_turn_start(self) -> List[str]:
        messages = self.apply_turn_effects()
        
        # Handle summoned ally
        if self.summoned_ally and self.combat:
            ally = self.summoned_ally
            enemy = self.combat["enemy"]
            ally_damage = ally["damage"]
            enemy.hp = max(0, enemy.hp - ally_damage)
            messages.append(f"Spirit ally attacks for {ally_damage} damage")
            
            ally["hp"] -= 1
            if ally["hp"] <= 0:
                self.summoned_ally = None
                messages.append("Spirit ally fades away")
        
        return messages
    
    def check_death(self) -> bool:
        if self.hp <= 0:
            if self.true_immortal:
                self.hp = self.max_hp
                return False
            elif self.immortal_turns > 0:
                self.hp = 1
                return False
            elif self.resurrect_charges > 0:
                self.resurrect_charges -= 1
                self.hp = self.max_hp
                return False
            else:
                return True
        return False


def apply_item_to_player(item_name: str, player: Player, enemy: Optional[Enemy] = None) -> List[str]:
    """Apply item effects to player."""
    # Local import to avoid circular dependency at import time
    from .effects import apply_item_effects
    return apply_item_effects(item_name, player, enemy)