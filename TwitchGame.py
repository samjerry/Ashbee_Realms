import os, asyncio, random, sys
from functools import wraps
from datetime import datetime
from twitchio.ext import commands

class TwitchGame:
    def __init__(self, on_log, on_event):
        self.on_log = on_log
        self.on_event = on_event

    def _say(self, user, text):
        self.on_log(text)

    def _loot(self, user, rarity, item_name):
        self.on_event("loot", {"rarity": rarity, "item": item_name})

# Fix Windows console output buffering
if os.name == 'nt':  # Windows
    try:
        import ctypes
        # Enable ANSI color codes on Windows
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except:
        pass

from game.engine import GameEngine, autoresolve_dead_foes_on_load
from game.models import Player
from game import data
from game.items import get_item, get_item_case_insensitive
from storage.json_storage import JSONStorage
from game.inventory import find_inventory_match


try:
    # flat module fallback
    from engine import apply_damage
except Exception:
    # ultra-safe fallback if engine.apply_damage isn't importable
    def apply_damage(target, dmg, source="attack"):
        try:
            dmg = int(max(0, dmg))
        except Exception:
            dmg = 0
        hp = max(0, int(getattr(target, "hp", 0)))
        setattr(target, "hp", max(0, hp - dmg))

# Effect descriptions for %effect command
EFFECT_DESCRIPTIONS = {
    # === BASIC EFFECTS ===
    "heal": "Restores HP immediately when used",
    "damage": "Increases base damage dealt in combat",
    "armor": "Reduces incoming damage from attacks",
    "mana": "Restores mana/energy for spell casting",
    "max_hp_bonus": "Permanently increases maximum health",
    
    # === COMBAT EFFECTS ===
    "damage_buff": "Temporarily increases damage dealt (has duration)",
    "armor_debuff": "Temporarily reduces armor protection (has duration)",
    "dodge": "Chance to completely avoid incoming attacks",
    "crit_chance": "Chance to deal critical (double) damage",
    "block_chance": "Chance to block and reduce incoming damage",
    "life_steal": "Heals you for a portion of damage dealt",
    "pierce": "Ignores a portion of enemy armor",
    "armor_pierce": "Completely ignores enemy armor on attacks",
    "true_strike": "Attacks never miss, guaranteed to hit",
    
    # === STATUS EFFECTS ===
    "bleed": "Causes damage over time each turn",
    "burn": "Fire damage over time each turn",
    "poison": "Poison damage over time each turn",
    "regen": "Heals HP each turn automatically",
    "stun_chance": "Chance to stun enemy, making them skip a turn",
    "intimidate": "Reduces enemy damage through fear",
    
    # === ELEMENTAL DAMAGE ===
    "fire_damage": "Additional fire-based damage on attacks",
    "ice_damage": "Additional cold-based damage on attacks",
    "lightning": "Additional electric damage on attacks",
    "lightning_damage": "Additional electric damage on attacks",
    "void_damage": "Additional void/darkness damage on attacks",
    "divine_damage": "Additional holy/light damage on attacks",
    "magic_damage": "Additional magical damage on attacks (boosted by mage spell power)",
    "undead_damage": "Extra damage against undead enemies",
    "light_damage": "Additional light-based damage, effective vs darkness",
    "earth_damage": "Additional earth-based damage, effective vs flying creatures",
    "divine_shield": "Divine protection that blocks dark magic and evil attacks",
    
    # === RESISTANCES ===
    "fire_resist": "Reduces incoming fire damage",
    "cold_resist": "Reduces incoming ice/cold damage",
    "magic_resist": "Reduces incoming magical damage",
    "all_resist": "Reduces all types of elemental damage",
    "void_protection": "Protection against void/darkness attacks",
    
    # === UTILITY EFFECTS ===
    "stealth": "Makes you harder to detect and hit",
    "stealth_bonus": "Improves stealth abilities and sneak attacks",
    "speed_buff": "Increases movement and action speed",
    "escape_chance": "Improves chance to flee from combat",
    "night_vision": "See clearly in dark environments",
    "grip": "Prevents weapon from being disarmed",
    
    # === MAGICAL EFFECTS ===
    "mana_regen": "Restores mana/energy each turn",
    "spell_power": "Increases the power of magical abilities (mages get +1 per level automatically)",
    "energy_absorb": "Absorbs incoming energy attacks",
    "reflect": "Reflects some damage back to attacker",
    "phase_shift": "Allows phasing through attacks",
    
    # === SPECIAL COMBAT ===
    "extra_turn": "Grants additional actions in combat",
    "heal_on_kill": "Heals you when you defeat an enemy",
    "summon_ally": "Summons creatures to fight alongside you",
    "storm_call": "Calls down lightning storms in combat",
    "quantum_strike": "Attacks that exist in multiple realities",
    
    # === STATUS REMOVAL ===
    "cure_poison": "Removes poison effects immediately",
    "cure_all": "Removes all negative status effects",
    "remove_curse": "Removes curse effects",
    
    # === LEGENDARY/MYTHIC EFFECTS ===
    "resurrect": "Automatically revive when killed (one time use)",
    "immortality": "Temporary protection from death",
    "true_immortality": "Cannot be killed by normal means",
    "infinite_regen": "Constantly regenerates health",
    "ascend": "Transcend physical limitations",
    "divine_power": "Wield the power of gods",
    "cosmic_power": "Control cosmic forces",
    "omnipotence": "Unlimited power over reality",
    "reality_control": "Reshape reality itself",
    "time_control": "Manipulate the flow of time",
    "time_mastery": "Complete mastery over temporal forces",
    "star_control": "Command the power of stars",
    "multiverse_control": "Control multiple realities",
    "probability_control": "Alter probability and chance",
    "create_world": "Create new worlds and dimensions",
    "create_matter": "Generate matter from nothing",
    "dimensional_rift": "Tear holes in space-time",
    "infinite_knowledge": "Know all things across all realities",
    "soul_steal": "Steal the souls of defeated enemies",
    "energy_body": "Transform into pure energy",
    "ancient_wisdom": "Access knowledge of ancient civilizations",
    "leadership": "Inspire allies and boost their abilities",
    "flight": "Ability to fly and avoid ground-based attacks",
    "detect_lies": "See through deception and illusions",
    "level_bonus": "Grants bonus experience or levels",
    "immunity": "Complete immunity to certain damage types",
    "all_stats": "Boosts all character statistics",
    
    # === PHYSICAL EFFECTS ===
    "kick_damage": "Additional damage from kick attacks",
    "punch_damage": "Additional damage from punch attacks",
    "hp_drain": "Drains enemy health over time"
}

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[INFO] python-dotenv not installed. Using system environment variables only.")
    print("[INFO] To use .env files, run: pip install python-dotenv")

# Constants
PREFIX = os.getenv("COMMAND_PREFIX", "%")
TWITCH_TOKEN = os.getenv("TWITCH_TOKEN")
TWITCH_NICK = os.getenv("TWITCH_NICK", "MyBot")
HARDCORE_MODE = os.getenv("HARDCORE_MODE", "true").lower() in ("true", "1", "yes", "on")
CHANNELS_FILE = "channels.txt"
MODERATOR_FILE = "moderator.txt"
BLACKLIST_FILE = "blacklist.txt"

# Logging function
def log_interaction(channel: str, user: str, command: str, result: str = ""):
    """Log user interactions to console with timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    channel_display = f"#{channel}" if not channel.startswith("#") else channel
    
    if result:
        print(f"[{timestamp}] {channel_display} | {user}: {command} -> {result}")
    else:
        print(f"[{timestamp}] {channel_display} | {user}: {command}")
    sys.stdout.flush()

# Game balance constants
BOSS_ENCOUNTER_RATE = 0.10
EXPLORE_COOLDOWN = 8
HUNT_COOLDOWN = 6
FIGHT_COOLDOWN = 4
SKILL_COOLDOWN = 5
RUN_SUCCESS_MOB = 0.6
RUN_SUCCESS_BOSS = 0.45
ROGUE_RUN_BONUS = 0.15
MIN_DEFEAT_LOSS = 2
MAX_DEFEAT_LOSS = 5


# Decorator for player validation with logging
def require_player(func):
    """Decorator to ensure player exists before executing command."""
    @wraps(func)
    async def wrapper(self, ctx, *args, **kwargs):
        key = self.key(ctx)
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} use {PREFIX}start first."
            await self.send_and_log(ctx, response)
            return
        
        # Inject player into ctx for the function to access
        ctx.player = player
        return await func(self, ctx, *args, **kwargs)
    return wrapper


def require_class(func):
    """Decorator to ensure player has chosen a class."""
    @wraps(func)
    async def wrapper(self, ctx, *args, **kwargs):
        player = ctx.player  # Get player from context
        if not player.clazz:
            response = f"@{ctx.author.name} pick a class with {PREFIX}class warrior|mage|rogue. Use {PREFIX}classes for details."
            await self.send_and_log(ctx, response)
            return
        return await func(self, ctx, *args, **kwargs)
    return wrapper


def require_combat(func):
    """Decorator to ensure player is in combat."""
    @wraps(func)
    async def wrapper(self, ctx, *args, **kwargs):
        player = ctx.player  # Get player from context
        if not player.combat:
            response = f"@{ctx.author.name} no active combat. Use {PREFIX}explore or {PREFIX}hunt."
            await self.send_and_log(ctx, response)
            return
        return await func(self, ctx, *args, **kwargs)
    return wrapper


def load_channels():
    try:
        with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
            channels = []
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    channels.append(line.lower())
            return channels
    except FileNotFoundError:
        print("[WARN] No channels.txt found. Add your channel name there.")
        return []


def load_moderators():
    """Load moderator usernames from moderator.txt"""
    try:
        with open(MODERATOR_FILE, "r", encoding="utf-8") as f:
            moderators = set()
            for line in f:
                line = line.strip().lower()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    moderators.add(line)
            return moderators
    except FileNotFoundError:
        print("[WARN] No moderator.txt found. No moderators configured.")
        return set()


def load_blacklist():
    """Load blacklisted usernames from blacklist.txt"""
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            blacklist = set()
            for line in f:
                line = line.strip().lower()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    blacklist.add(line)
            return blacklist
    except FileNotFoundError:
        return set()


def save_blacklist(blacklist_set):
    """Save blacklist to file"""
    try:
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            f.write("# Blacklisted users (auto-generated)\n")
            for user in sorted(blacklist_set):
                f.write(f"{user}\n")
    except Exception as e:
        print(f"[ERROR] Failed to save blacklist: {e}")
        sys.stdout.flush()


def require_moderator(func):
    """Decorator to ensure user is a moderator before executing command."""
    @wraps(func)
    async def wrapper(self, ctx, *args, **kwargs):
        if ctx.author.name.lower() not in self.moderators:
            response = f"@{ctx.author.name} you need moderator permissions for this command."
            await self.send_and_log(ctx, response)
            return
        return await func(self, ctx, *args, **kwargs)
    return wrapper


class AdventureBot(commands.Bot):
    def __init__(self, channels):
        super().__init__(token=TWITCH_TOKEN, prefix=PREFIX, nick=TWITCH_NICK, initial_channels=channels)
        self.store = JSONStorage()
        self.state: dict[str, Player] = self.store.load()
        autoresolve_dead_foes_on_load(self.state.values())
        self.lock = asyncio.Lock()
        self.engine = GameEngine()
        self.moderators = load_moderators()
        self.blacklist = load_blacklist()

    async def event_ready(self):
        print("="*80)
        print(f"[READY] Connected as {self.nick} in {len(self.connected_channels)} channel(s).")
        print(f"[INFO] Command prefix: {PREFIX}")
        print(f"[INFO] Hardcore mode: {'ON' if HARDCORE_MODE else 'OFF'} (death {'deletes character' if HARDCORE_MODE else 'loses 20% gold'})")
        print(f"[INFO] Logging all user interactions to console")
        print("="*80)
        sys.stdout.flush()  # Force console output

    async def event_message(self, message):
        # Don't log messages from the bot itself
        if message.echo:
            return
        
        # Check if user is blacklisted
        if message.author.name.lower() in self.blacklist and message.content.startswith(PREFIX):
            # Don't process commands from blacklisted users, just log
            log_interaction(
                channel=message.channel.name,
                user=message.author.name,
                command=message.content,
                result="[BLACKLISTED]"
            )
            return
            
        # Log all messages that start with command prefix
        if message.content.startswith(PREFIX):
            log_interaction(
                channel=message.channel.name,
                user=message.author.name,
                command=message.content
            )
        
        try:
            await self.handle_commands(message)
        except Exception as e:
            error_msg = f"Command failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            sys.stdout.flush()
            # Also send error to chat for the user
            if message.content.startswith(PREFIX):
                await message.channel.send(f"@{message.author.name} {error_msg}")
                # Log the error response too
                log_interaction(
                    channel=message.channel.name,
                    user="BOT",
                    command="ERROR",
                    result=f"@{message.author.name} {error_msg}"
                )

    # --- helpers ---
    def key(self, ctx):
        return f"{ctx.channel.name}#{ctx.author.name.lower()}"
    
    def clean_username(self, username: str) -> str:
        """Remove @ symbol and clean username for lookup."""
        return username.strip().lstrip('@').strip().lower()
    
    async def send_and_log(self, ctx, message: str):
        """Send message to chat and log it."""
        await ctx.send(message)
        # Log the bot's response
        log_interaction(
            channel=ctx.channel.name,
            user="BOT",
            command="RESPONSE",
            result=message
        )

    async def persist(self):
        try:
            async with self.lock:
                self.store.save(self.state)
        except Exception as e:
            print(f"[ERROR] Failed to save game state: {e}")
            sys.stdout.flush()

    async def _handle_combat_resolution(self, ctx, player, enemy, player_action_result: str):
        """Common logic for handling combat resolution after player actions."""
        if enemy.hp <= 0:
            victory_msg = self.engine.end_combat(player, victory=True)
            response = f"@{ctx.author.name} {player_action_result} {victory_msg}"
            await self.send_and_log(ctx, response)
            await self.persist()
            return True

        enemy_action = self.engine.enemy_turn(player, enemy)
        
        if player.hp <= 0:
            await self._handle_player_defeat(ctx, player, player_action_result, enemy_action)
        else:
            response = (
                f"@{ctx.author.name} {player_action_result} {enemy_action} "
                f"(Foe {enemy.hp}/{enemy.max_hp} | You {player.hp}/{player.max_hp})"
            )
            await self.send_and_log(ctx, response)

        self.engine.after_round(player)
        await self.persist()
        return False

    async def _handle_player_defeat(self, ctx, player, player_action: str, enemy_action: str):
        """Handle player defeat in combat."""
        if HARDCORE_MODE:
            # Hardcore: Complete character deletion
            key = self.key(ctx)
            if key in self.state:
                del self.state[key]
            response = (
                f"@{ctx.author.name} {player_action} {enemy_action} "
                f"You have PERISHED! Your character is lost forever. Use {PREFIX}start to create a new character."
            )
        else:
            # Non-hardcore: Gold penalty and survival
            import math
            gold_loss = math.ceil(player.gold * 0.20) if player.gold > 0 else 0
            player.gold = max(0, player.gold - gold_loss)
            player.hp = 1
            player.combat = None
            response = (
                f"@{ctx.author.name} {player_action} {enemy_action} "
                f"You were defeated. Lost {gold_loss}g (20% penalty)."
                f"You wake up in an unknown location."
            )
        
        await self.send_and_log(ctx, response)

    # --- commands ---
    @commands.command(name="start", aliases=["begin", "s"])
    async def start(self, ctx: commands.Context):
        key = self.key(ctx)
        if key in self.state:
            response = f"@{ctx.author.name} you already have a save. Use {PREFIX}stats or {PREFIX}explore."
            await self.send_and_log(ctx, response)
            return
        
        player = self.engine.new_player(ctx.author.name)
        self.state[key] = player
        response = (
            f"@{ctx.author.name} begins at {player.location} "
            f"(Lvl {player.level}, HP {player.hp}/{player.max_hp}). "
            f"Pick a class with {PREFIX}class warrior|mage|rogue or review them with {PREFIX}classes"
        )
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="classes")
    async def show_classes(self, ctx: commands.Context):
        """Show detailed class information."""
        # Send header message
        header = f"@{ctx.author.name} CLASS OVERVIEW:"
        await self.send_and_log(ctx, header)
        
        # Send separate message for each class
        for class_name, class_info in data.CLASSES.items():
            response = (
                f"* {class_name.upper()}: {class_info['description']} "
                f"| Starting HP: {12 + class_info['hp_bonus']} ({class_info['hp_bonus']:+d} bonus) "
                f"| Passive: {class_info['passive']} "
                f"| Skill: {class_info['skill']['name']} ({class_info['skill']['cd']} turn CD) "
                f"| Style: {class_info['playstyle']}"
            )
            await self.send_and_log(ctx, response)
        
        # Send footer message
        footer = f"Choose with {PREFIX}class <warrior|mage|rogue>"
        await self.send_and_log(ctx, footer)

    @commands.command(name="class")
    async def set_class(self, ctx: commands.Context, chosen: str = ""):
        # Get player manually
        key = self.key(ctx)
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} use {PREFIX}start first."
            await self.send_and_log(ctx, response)
            return
            
        if player.clazz:
            response = f"@{ctx.author.name} you already chose {player.clazz}."
            await self.send_and_log(ctx, response)
            return
        
        chosen = chosen.lower().strip()
        if chosen not in data.CLASSES:
            response = f"@{ctx.author.name} choose one: warrior, mage, rogue. Use {PREFIX}classes for details."
            await self.send_and_log(ctx, response)
            return
        
        class_info = data.CLASSES[chosen]
        player.clazz = chosen
        player.max_hp += class_info["hp_bonus"]
        player.hp = player.max_hp
        
        response = (
            f"@{ctx.author.name} is now a {chosen.title()}! "
            f"Passive: {class_info['passive']} | Skill: {class_info['skill']['name']}. HP {player.hp}."
        )
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="explore")
    @commands.cooldown(rate=1, per=EXPLORE_COOLDOWN, bucket=commands.Bucket.user)
    @require_player
    @require_class
    async def explore(self, ctx: commands.Context):
        player = ctx.player  # Get player from context
        if player.combat:
            response = f"@{ctx.author.name} in combat! Use {PREFIX}fight/{PREFIX}skill/{PREFIX}run."
            await self.send_and_log(ctx, response)
            return
        
        if player.pending:
            response = f"@{ctx.author.name} you already have a choice pending. Use {PREFIX}choose <option>."
            await self.send_and_log(ctx, response)
            return
        
        if random.random() < BOSS_ENCOUNTER_RATE:
            msg = self.engine.start_boss_combat(player)
            response = f"@{ctx.author.name} {msg}"
            await self.send_and_log(ctx, response)
        else:
            player.pending = self.engine.random_event()
            choices = '/'.join(player.pending['choices'])
            response = f"@{ctx.author.name} {player.pending['text']} Use {PREFIX}choose <{choices}>"
            await self.send_and_log(ctx, response)
        
        await self.persist()

    @commands.command(name="hunt")
    @commands.cooldown(rate=1, per=HUNT_COOLDOWN, bucket=commands.Bucket.user)
    @require_player
    async def hunt(self, ctx: commands.Context):
        player = ctx.player  # Get player from context
        if player.combat:
            response = f"@{ctx.author.name} already in combat."
            await self.send_and_log(ctx, response)
            return
        
        msg = self.engine.start_mob_combat(player)
        response = f"@{ctx.author.name} {msg}"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="choose", aliases=["pick", "select", "c"])
    @require_player
    async def choose(self, ctx: commands.Context, option: str = ""):
        player = ctx.player  # Get player from context
        if not option:
            response = f"@{ctx.author.name} usage: {PREFIX}choose <option>"
            await self.send_and_log(ctx, response)
            return
        
        msg = self.engine.handle_choice(player, option)
        response = f"@{ctx.author.name} {msg} (HP {player.hp}/{player.max_hp}, {player.gold}g)"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="answer", aliases=["solve", "guess"])
    @require_player
    async def riddle_answer(self, ctx: commands.Context, *, answer: str = ""):
        player = ctx.player  # Get player from context
        if not answer:
            response = f"@{ctx.author.name} usage: {PREFIX}answer <your_guess>"
            await self.send_and_log(ctx, response)
            return
        
        msg = self.engine.handle_riddle_answer(player, answer)
        response = f"@{ctx.author.name} {msg} (HP {player.hp}/{player.max_hp}, {player.gold}g)"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="stats", aliases=["status", "profile", "level", "st"])
    @require_player
    async def stats(self, ctx: commands.Context):
        player = ctx.player  # Get player from context
        bag = ', '.join(player.inventory) if player.inventory else 'empty'
        cls = player.clazz or "unassigned"
        
        # Add class-specific info
        class_info = ""
        if player.clazz == "mage":
            spell_power = player.get_spell_power() if hasattr(player, 'get_spell_power') else 0
            if spell_power > 0:
                class_info = f" | Spell Power: {spell_power}"
        elif player.clazz == "warrior":
            total_armor = player.get_total_armor() if hasattr(player, 'get_total_armor') else 0
            if total_armor > 0:
                class_info = f" | Armor: {total_armor}"
        elif player.clazz == "rogue":
            dodge = player.get_dodge_chance() if hasattr(player, 'get_dodge_chance') else 0
            if dodge > 0:
                class_info = f" | Dodge: {dodge}%"
        
        combat_info = ""
        if player.combat:
            enemy = player.combat['enemy']
            combat_info = f" | In Combat vs {enemy.name} ({enemy.hp}/{enemy.max_hp})"
        
        # Show equipped items summary
        equipped_items = player.get_equipped_items() if hasattr(player, 'get_equipped_items') else []
        equipped_text = f"{len(equipped_items)} equipped" if equipped_items else "none equipped"
        
        response = (
            f"@{ctx.author.name} Lvl {player.level} ({player.xp}/{player.xp_to_next} XP) | "
            f"Class: {cls} | HP {player.hp}/{player.max_hp} | Gold {player.gold}{class_info} | "
            f"Bag: {bag} | Equipped: {equipped_text}{combat_info}"
        )
        await self.send_and_log(ctx, response)

    @commands.command(name="heal")
    @require_player
    async def heal(self, ctx: commands.Context):
        player = ctx.player  # Get player from context
        if "Potion" in player.inventory:
            player.inventory.remove("Potion")
            healed = min(6, player.max_hp - player.hp)
            player.hp += healed
            response = f"@{ctx.author.name} used a Potion and healed {healed} HP. ({player.hp}/{player.max_hp})"
            await self.send_and_log(ctx, response)
        else:
            response = f"@{ctx.author.name} you have no Potion."
            await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="boss")
    @require_moderator
    async def force_boss(self, ctx: commands.Context, user: str = ""):
        if not user:
            response = f"Usage (mod): {PREFIX}boss <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(user)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"{user} has no save. Ask them to {PREFIX}start."
            await self.send_and_log(ctx, response)
            return
        
        if player.combat:
            response = f"{user} is already in combat."
            await self.send_and_log(ctx, response)
            return
        
        msg = self.engine.start_boss_combat(player)
        response = f"@{user} {msg}"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="fight", aliases=["attack", "hit", "strike", "f"])
    @commands.cooldown(rate=1, per=FIGHT_COOLDOWN, bucket=commands.Bucket.user)
    @require_player
    @require_combat
    async def fight(self, ctx: commands.Context):
        p = ctx.player
        enc = getattr(p, "current_encounter", None) or getattr(p, "encounter", None) or p.combat
        if not enc:
            await self.send_and_log(ctx, f"@{ctx.author.name} there's nothing to fight.")
            return

        # Our data model stores enemy in the combat dict
        e = enc.get("enemy") if isinstance(enc, dict) else getattr(enc, "enemy", None)
        if not e:
            await self.send_and_log(ctx, f"@{ctx.author.name} there's nothing to fight.")
            return

        # --- NEW: if enemy already dead, immediately resolve victory & return spoils ---
        if getattr(e, "hp", 0) <= 0:
            victory_msg = self.engine.end_combat(p, victory=True)
            await self.send_and_log(ctx, f"@{ctx.author.name} foe down! {victory_msg}")
            await self.persist()
            return

        # If combat object was already marked resolved, avoid double processing
        if (isinstance(enc, dict) and enc.get("resolved")) or getattr(enc, "resolved", False):
            await self.send_and_log(ctx, f"@{ctx.author.name} combat already resolved.")
            return

        # --- compute damage using existing code when available ---
        dmg = None
        if hasattr(self.engine, "compute_player_attack_damage"):
            try:
                dmg = max(0, int(self.engine.compute_player_attack_damage(p, e)))
            except Exception:
                pass

        # Fallback: player's own calculator (not applying damage)
        if dmg is None and hasattr(p, "compute_player_attack_damage"):
            try:
                dmg = max(0, int(p.compute_player_attack_damage(e)))
            except Exception:
                pass

        if dmg is None:
            dmg = max(1, int(getattr(p, "level", 1)))

        # --- apply damage via centralized engine hook ---
        apply_damage(e, dmg, source="attack")

        # --- format result with existing formatter if available ---
        if hasattr(self.engine, "format_fight_result"):
            player_action_result = self.engine.format_fight_result(p, e, dmg)
        else:
            player_action_result = f"You strike {e.name} for {dmg}."

        await self._handle_combat_resolution(ctx, p, e, player_action_result)


    @commands.command(name="skill")
    @commands.cooldown(rate=1, per=SKILL_COOLDOWN, bucket=commands.Bucket.user)
    @require_player
    @require_combat
    @require_class
    async def skill(self, ctx: commands.Context):
        player = ctx.player
        if player.skill_cd > 0:
            await self.send_and_log(ctx, f"@{ctx.author.name} skill on cooldown: {player.skill_cd} turn(s).")
            return

        enc = getattr(player, "current_encounter", None) or getattr(player, "encounter", None) or player.combat
        if not enc:
            await self.send_and_log(ctx, f"@{ctx.author.name} there's nothing to fight.")
            return

        enemy = enc.get("enemy") if isinstance(enc, dict) else getattr(enc, "enemy", None)
        if not enemy:
            await self.send_and_log(ctx, f"@{ctx.author.name} there's nothing to fight.")
            return

        if getattr(enemy, "hp", 0) <= 0 or (isinstance(enc, dict) and enc.get("resolved")) or getattr(enc, "resolved", False):
            await self.send_and_log(ctx, f"@{ctx.author.name} the enemy is already down.")
            return

        # Continue with existing skill logic
        action_result = player.use_skill(enemy)
        await self._handle_combat_resolution(ctx, player, enemy, action_result)


    @commands.command(name="use")
    @require_player
    async def use_item(self, ctx: commands.Context, *, item_query: str = ""):
        player = ctx.player
        if not item_query:
            await self.send_and_log(ctx, f"@{ctx.author.name} usage: {PREFIX}use <item name>")
            return

        match, suggestions = find_inventory_match(player.inventory, item_query)
        if not match:
            if suggestions:
                hint = "; ".join(suggestions)
                await self.send_and_log(ctx, f"@{ctx.author.name} Unknown item or not in your bag. Did you mean: {hint}?")
            else:
                await self.send_and_log(ctx, f"@{ctx.author.name} Unknown item or you don't have it.")
            return

        # Resolve to actual item definition (case/space safe)
        item = get_item_case_insensitive(match)
        if not item:
            await self.send_and_log(ctx, f"@{ctx.author.name} Item '{match}' isn’t defined. (Dev: add it to ITEMS.)")
            return

        # Check usability
        if not getattr(item, "usable", False) or item.type.name.lower() != "consumable":
            await self.send_and_log(ctx, f"@{ctx.author.name} Cannot use {item.name}.")
            return

        # Consume one and apply effects
        try:
            player.inventory.remove(match)  # remove exactly what the player has
        except ValueError:
            await self.send_and_log(ctx, f"@{ctx.author.name} You don't have {match} anymore.")
            return

        msg = item.use(player)
        # If in combat, show foe hp after use if applicable
        suffix = ""
        if player.combat:
            enemy = player.combat["enemy"]
            suffix = f" | Foe {enemy.hp}/{enemy.max_hp}"
        await self.send_and_log(ctx, f"@{ctx.author.name} {msg} (HP {player.hp}/{player.max_hp}){suffix}")
        await self.persist()

    def _use_item(self, player: Player, item: str) -> str:
        """Handle item usage logic."""
        def consume(name: str) -> bool:
            if name in player.inventory:
                player.inventory.remove(name)
                return True
            return False

        def has_item(name: str) -> bool:
            return name in player.inventory

        # Handle consumable items (potions)
        if item == "potion":
            if consume("Potion"):
                heal = min(6, player.max_hp - player.hp)
                player.hp += heal
                return f"You drink a Potion and heal {heal} HP."
            return "You have no Potion."
        
        elif item in ("greater potion", "greater"):
            if consume("Greater Potion"):
                heal = min(10, player.max_hp - player.hp)
                player.hp += heal
                return f"You drink a Greater Potion and heal {heal} HP."
            return "You have no Greater Potion."
        
        # Handle armor items (passive effects, not consumed)
        elif item in ("cloak of shadows", "cloak"):
            if has_item("Cloak of Shadows"):
                return "Your Cloak of Shadows is already providing +25% dodge and stealth bonus while in your inventory."
            return "You have no Cloak of Shadows."
        
        # Handle other common armor items
        elif item in ("wool cloak", "wool"):
            if has_item("Wool Cloak"):
                return "Your Wool Cloak is already providing warmth and protection while in your inventory."
            return "You have no Wool Cloak."
        
        # Handle rings and accessories  
        elif item in ("ring of protection", "ring"):
            if has_item("Ring of Protection"):
                return "Your Ring of Protection is already providing magical defense while in your inventory."
            return "You have no Ring of Protection."
        
        # Check if it's a valid item name but not usable
        # Convert item name to proper case for comparison
        proper_item = ' '.join(word.capitalize() for word in item.split())
        if has_item(proper_item):
            return f"Your {proper_item} provides passive benefits while in your inventory. It doesn't need to be 'used'."
        
        return "Unknown item or you don't have it."

    @commands.command(name="run")
    @require_player
    @require_combat
    async def run_(self, ctx: commands.Context):
        player = ctx.player  # Get player from context
        enemy = player.combat["enemy"]
        base_success = RUN_SUCCESS_MOB if enemy.type == "mob" else RUN_SUCCESS_BOSS
        
        if player.clazz == "rogue":
            base_success += ROGUE_RUN_BONUS
        
        if random.random() < base_success:
            msg = self.engine.end_combat(player, victory=False)
            response = f"@{ctx.author.name} You escape. {msg}"
            await self.send_and_log(ctx, response)
        else:
            enemy_action = self.engine.enemy_turn(player, enemy)
            if player.hp <= 0:
                await self._handle_player_defeat(ctx, player, "Failed to run.", enemy_action)
            else:
                response = (
                    f"@{ctx.author.name} Couldn't escape. {enemy_action} "
                    f"(Foe {enemy.hp}/{enemy.max_hp} | You {player.hp}/{player.max_hp})"
                )
                await self.send_and_log(ctx, response)
        
        self.engine.after_round(player)
        await self.persist()

    @commands.command(name="equip", aliases=["wear", "eq"])
    @require_player
    async def equip_item(self, ctx: commands.Context, *, item_name: str = ""):
        """Equip an item from inventory."""
        player = ctx.player
        if not item_name:
            response = f"@{ctx.author.name} usage: {PREFIX}equip <item_name> (e.g., {PREFIX}equip Cloak of Shadows)"
            await self.send_and_log(ctx, response)
            return
        
        success, message = player.equip_item(item_name)
        response = f"@{ctx.author.name} {message}"
        await self.send_and_log(ctx, response)
        if success:
            await self.persist()

    @commands.command(name="unequip", aliases=["remove", "uneq"])
    @require_player
    async def unequip_item(self, ctx: commands.Context, *, item_name: str = ""):
        """Unequip an item to inventory."""
        player = ctx.player
        if not item_name:
            response = f"@{ctx.author.name} usage: {PREFIX}unequip <item_name> (e.g., {PREFIX}unequip Cloak of Shadows)"
            await self.send_and_log(ctx, response)
            return
        
        success, message = player.unequip_item(item_name)
        response = f"@{ctx.author.name} {message}"
        await self.send_and_log(ctx, response)
        if success:
            await self.persist()

    @commands.command(name="equipment", aliases=["gear", "eq"])
    @require_player
    async def show_equipment(self, ctx: commands.Context):
        """Show detailed equipment slots."""
        player = ctx.player
        
        # Group slots for display
        main_slots = ["headgear", "armor", "legs", "footwear", "hands", "cape", "main_hand", "off_hand"]
        jewelry_slots = ["amulet", "ring1", "ring2", "belt"]
        flavor_slots = ["flavor1", "flavor2", "flavor3"]
        
        equipped_items = []
        empty_slots = []
        
        for slot in main_slots + jewelry_slots + flavor_slots:
            item = player.equipped.get(slot)
            if item:
                equipped_items.append(f"{slot}: {item}")
            else:
                empty_slots.append(slot)
        
        if equipped_items:
            response = f"@{ctx.author.name} EQUIPPED: {', '.join(equipped_items[:3])}{'...' if len(equipped_items) > 3 else ''} | Empty: {len(empty_slots)} slots"
        else:
            response = f"@{ctx.author.name} No items equipped. Use {PREFIX}equip <item> to equip gear from inventory."
        
        await self.send_and_log(ctx, response)

    # --- Help and Info Commands ---
    @commands.command(name="help", aliases=["commands"])
    async def help_command(self, ctx: commands.Context):
        """Show all available commands."""
        response = f"@{ctx.author.name} COMMANDS: {PREFIX}start, {PREFIX}classes, {PREFIX}stats, {PREFIX}equipment, {PREFIX}explore, {PREFIX}hunt, {PREFIX}choose, {PREFIX}answer, {PREFIX}fight, {PREFIX}skill, {PREFIX}run, {PREFIX}use, {PREFIX}heal, {PREFIX}equip, {PREFIX}unequip, {PREFIX}inspect, {PREFIX}effect, {PREFIX}trait, {PREFIX}mode"
        await self.send_and_log(ctx, response)

    @commands.command(name="mode")
    async def show_mode(self, ctx: commands.Context):
        """Show current game mode settings."""
        mode_text = "HARDCORE" if HARDCORE_MODE else "NON-HARDCORE"
        death_text = "character deletion" if HARDCORE_MODE else "20% gold loss"
        response = f"@{ctx.author.name} Game mode: {mode_text} | Death penalty: {death_text}"
        await self.send_and_log(ctx, response)

    @commands.command(name="inspect", aliases=["info"])
    async def inspect_item(self, ctx: commands.Context, *, item_name: str = ""):
        """Show detailed information about an item."""
        if not item_name:
            response = f"@{ctx.author.name} usage: {PREFIX}inspect <item_name> (e.g., {PREFIX}inspect Cloak of Shadows)"
            await self.send_and_log(ctx, response)
            return
        
        # Look up the item in the database
        item_data = get_item(item_name.strip())
        if not item_data:
            response = f"@{ctx.author.name} '{item_name}' is not a known item."
            await self.send_and_log(ctx, response)
            return
        
        # Format effects for display
        effects_text = ""
        if item_data.effects:
            effect_descriptions = []
            for effect in item_data.effects:
                if effect.duration:
                    effect_descriptions.append(f"{effect.type} +{effect.value} ({effect.duration} turns)")
                else:
                    effect_descriptions.append(f"{effect.type} +{effect.value}")
            effects_text = f" | Effects: {', '.join(effect_descriptions)}"
        
        # Create detailed response
        response = (
            f"@{ctx.author.name} {item_data.name} ({item_data.rarity.value.upper()} {item_data.type.value.upper()}) "
            f"| {item_data.description}{effects_text} | Value: {item_data.value}g"
        )
        await self.send_and_log(ctx, response)

    @commands.command(name="effect")
    async def explain_effect(self, ctx: commands.Context, *, effect_name: str = ""):
        """Explain what a specific item effect does in the game."""
        if not effect_name:
            response = f"@{ctx.author.name} usage: {PREFIX}effect <effect_name> (e.g., {PREFIX}effect light_damage)"
            await self.send_and_log(ctx, response)
            return
        
        # Normalize the effect name
        effect_key = effect_name.lower().strip().replace(" ", "_")
        
        # Look up the effect description
        if effect_key in EFFECT_DESCRIPTIONS:
            effect_desc = EFFECT_DESCRIPTIONS[effect_key]
            response = f"@{ctx.author.name} {effect_name.upper()}: {effect_desc}"
            await self.send_and_log(ctx, response)
        else:
            # Check for partial matches
            partial_matches = [key for key in EFFECT_DESCRIPTIONS.keys() if effect_key in key]
            if partial_matches:
                if len(partial_matches) == 1:
                    # Single match found, show it
                    match_key = partial_matches[0]
                    effect_desc = EFFECT_DESCRIPTIONS[match_key]
                    response = f"@{ctx.author.name} {match_key.upper()}: {effect_desc}"
                    await self.send_and_log(ctx, response)
                else:
                    # Multiple matches, show options
                    matches_text = ', '.join(partial_matches[:5])  # Limit to 5 matches
                    response = f"@{ctx.author.name} Multiple effects found: {matches_text}. Be more specific."
                    await self.send_and_log(ctx, response)
            else:
                response = f"@{ctx.author.name} Unknown effect '{effect_name}'. Try {PREFIX}effect damage or {PREFIX}effect dodge for examples."
                await self.send_and_log(ctx, response)

    @commands.command(name="trait")
    async def explain_trait(self, ctx: commands.Context, *, trait_name: str = ""):
        """Explain what a specific monster trait does in combat."""
        if not trait_name:
            response = f"@{ctx.author.name} usage: {PREFIX}trait <trait_name> (e.g., {PREFIX}trait evasive)"
            await self.send_and_log(ctx, response)
            return
        
        # Normalize the trait name
        trait_key = trait_name.lower().strip().replace(" ", "_")
        
        # Look up the trait
        if trait_key in data.MONSTER_TRAITS:
            trait_info = data.MONSTER_TRAITS[trait_key]
            description = trait_info["description"]
            mechanics = trait_info["mechanics"]
            category = trait_info["category"]
            response = f"@{ctx.author.name} {trait_name.upper()} ({category}): {description} | Mechanics: {mechanics}"
            await self.send_and_log(ctx, response)
        else:
            # Check for partial matches
            partial_matches = [key for key in data.MONSTER_TRAITS.keys() if trait_key in key]
            if partial_matches:
                if len(partial_matches) == 1:
                    # Single match found
                    match_key = partial_matches[0]
                    trait_info = data.MONSTER_TRAITS[match_key]
                    description = trait_info["description"]
                    response = f"@{ctx.author.name} {match_key.upper()}: {description}"
                    await self.send_and_log(ctx, response)
                else:
                    # Multiple matches
                    matches_text = ', '.join(partial_matches[:5])
                    response = f"@{ctx.author.name} Multiple traits found: {matches_text}. Be more specific."
                    await self.send_and_log(ctx, response)
            else:
                response = f"@{ctx.author.name} Unknown trait '{trait_name}'. Try {PREFIX}trait evasive or {PREFIX}trait intimidate for examples."
                await self.send_and_log(ctx, response)

    # --- Moderator Commands ---
    @commands.command(name="modgive")
    @require_moderator
    async def modgive(self, ctx: commands.Context, user: str, *, item_name: str):
        clean_user = self.clean_username(user)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            await self.send_and_log(ctx, f"{user} has no save.")
            return

        item = get_item_case_insensitive(item_name)  # or your get_item() helper
        if not item:
            await self.send_and_log(ctx, f"Unknown item: {item_name}")
            return

        player.inventory.append(item.name)
        await self.send_and_log(ctx, f"@{ctx.author.name} Gave {item.name} to {user}.")
        await self.persist()


    @commands.command(name="modgold")
    @require_moderator
    async def mod_give_gold(self, ctx: commands.Context, username: str = "", amount: str = ""):
        """Give gold to a player."""
        if not username or not amount:
            response = f"@{ctx.author.name} Usage: {PREFIX}modgold <username> <amount> (e.g., {PREFIX}modgold @user 100)"
            await self.send_and_log(ctx, response)
            return
        
        try:
            gold_amount = int(amount)
        except ValueError:
            response = f"@{ctx.author.name} Amount must be a number."
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        player.gold += gold_amount
        response = f"@{ctx.author.name} Gave {gold_amount} gold to {username.lstrip('@')}. (Total: {player.gold}g)"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modheal")
    @require_moderator
    async def mod_heal_player(self, ctx: commands.Context, username: str = ""):
        """Fully heal a player."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modheal <username> (e.g., {PREFIX}modheal @user)"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        player.hp = player.max_hp
        response = f"@{ctx.author.name} Fully healed {username.lstrip('@')}. ({player.hp}/{player.max_hp} HP)"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modlevel")
    @require_moderator
    async def mod_set_level(self, ctx: commands.Context, username: str = "", level: str = ""):
        """Set a player's level."""
        if not username or not level:
            response = f"@{ctx.author.name} Usage: {PREFIX}modlevel <username> <level>"
            await self.send_and_log(ctx, response)
            return
        
        try:
            new_level = int(level)
            if new_level < 1:
                raise ValueError("Level must be positive")
        except ValueError:
            response = f"@{ctx.author.name} Level must be a positive number."
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        old_level = player.level
        player.level = new_level
        player.xp_to_next = new_level * 10
        response = f"@{ctx.author.name} Set {username.lstrip('@')}'s level from {old_level} to {new_level}."
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modreset")
    @require_moderator
    async def mod_reset_player(self, ctx: commands.Context, username: str = ""):
        """Reset a player completely."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modreset <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        if key not in self.state:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        del self.state[key]
        response = f"@{ctx.author.name} Reset {username.lstrip('@')}'s save data."
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modteleport")
    @require_moderator
    async def mod_teleport_player(self, ctx: commands.Context, username: str = "", location: str = ""):
        """Teleport a player to a location."""
        if not username or not location:
            response = f"@{ctx.author.name} Usage: {PREFIX}modteleport <username> <location>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        old_location = player.location
        player.location = location
        response = f"@{ctx.author.name} Teleported {username.lstrip('@')} from {old_location} to {location}."
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modkill")
    @require_moderator
    async def mod_kill_player(self, ctx: commands.Context, username: str = ""):
        """Set a player's HP to 1."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modkill <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        player.hp = 1
        player.combat = None  # End combat if active
        response = f"@{ctx.author.name} {username.lstrip('@')} has been defeated. (HP: 1)"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modclear")
    @require_moderator
    async def mod_clear_inventory(self, ctx: commands.Context, username: str = ""):
        """Clear a player's inventory."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modclear <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        player.inventory.clear()
        response = f"@{ctx.author.name} Cleared {username.lstrip('@')}'s inventory."
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modstats")
    @require_moderator
    async def mod_view_stats(self, ctx: commands.Context, username: str = ""):
        """View any player's stats."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modstats <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        bag = ', '.join(player.inventory) if player.inventory else 'empty'
        cls = player.clazz or "unassigned"
        
        combat_info = ""
        if player.combat:
            enemy = player.combat['enemy']
            combat_info = f" | In Combat vs {enemy.name} ({enemy.hp}/{enemy.max_hp})"
        
        response = (
            f"@{ctx.author.name} {username}: Lvl {player.level} ({player.xp}/{player.xp_to_next} XP) | "
            f"Class: {cls} | HP {player.hp}/{player.max_hp} | Gold {player.gold} | "
            f"Bag: {bag}{combat_info}"
        )
        await self.send_and_log(ctx, response)

    @commands.command(name="modforceboss")
    @require_moderator
    async def mod_force_boss(self, ctx: commands.Context, username: str = ""):
        """Force a player into boss combat."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}modforceboss <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        if player.combat:
            response = f"@{ctx.author.name} {username} is already in combat."
            await self.send_and_log(ctx, response)
            return
        
        msg = self.engine.start_boss_combat(player)
        response = f"@{ctx.author.name} Forced {username} into boss combat: {msg}"
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="modsetclass")
    @require_moderator
    async def mod_set_class(self, ctx: commands.Context, username: str = "", chosen: str = ""):
        """Force set a player's class."""
        if not username or not chosen:
            response = f"@{ctx.author.name} Usage: {PREFIX}modsetclass <username> <warrior|mage|rogue>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        key = f"{ctx.channel.name}#{clean_user}"
        player = self.state.get(key)
        if not player:
            response = f"@{ctx.author.name} Player {username} not found."
            await self.send_and_log(ctx, response)
            return
        
        chosen = chosen.lower().strip()
        if chosen not in data.CLASSES:
            response = f"@{ctx.author.name} Invalid class. Choose: warrior, mage, rogue."
            await self.send_and_log(ctx, response)
            return
        
        class_info = data.CLASSES[chosen]
        old_class = player.clazz
        player.clazz = chosen
        
        # Reset HP bonus if changing class
        if old_class and old_class in data.CLASSES:
            player.max_hp -= data.CLASSES[old_class]["hp_bonus"]
        player.max_hp += class_info["hp_bonus"]
        player.hp = player.max_hp
        
        response = f"@{ctx.author.name} Set {username}'s class to {chosen.title()}."
        await self.send_and_log(ctx, response)
        await self.persist()

    @commands.command(name="gameban")
    @require_moderator
    async def mod_gameban_user(self, ctx: commands.Context, username: str = ""):
        """Ban a user from using any bot commands."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}gameban <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        
        # Don't ban moderators
        if clean_user in self.moderators:
            response = f"@{ctx.author.name} Cannot ban a moderator."
            await self.send_and_log(ctx, response)
            return
        
        # Don't ban if already banned
        if clean_user in self.blacklist:
            response = f"@{ctx.author.name} {username.lstrip('@')} is already banned."
            await self.send_and_log(ctx, response)
            return
        
        # Add to blacklist
        self.blacklist.add(clean_user)
        save_blacklist(self.blacklist)
        
        response = f"@{ctx.author.name} Banned {username.lstrip('@')} from using bot commands."
        await self.send_and_log(ctx, response)

    @commands.command(name="gameunban")
    @require_moderator
    async def mod_gameunban_user(self, ctx: commands.Context, username: str = ""):
        """Unban a user from using bot commands."""
        if not username:
            response = f"@{ctx.author.name} Usage: {PREFIX}gameunban <username>"
            await self.send_and_log(ctx, response)
            return
        
        clean_user = self.clean_username(username)
        
        # Check if user is banned
        if clean_user not in self.blacklist:
            response = f"@{ctx.author.name} {username.lstrip('@')} is not banned."
            await self.send_and_log(ctx, response)
            return
        
        # Remove from blacklist
        self.blacklist.remove(clean_user)
        save_blacklist(self.blacklist)
        
        response = f"@{ctx.author.name} Unbanned {username.lstrip('@')} from using bot commands."
        await self.send_and_log(ctx, response)

    @commands.command(name="modhelp")
    @require_moderator
    async def mod_help_command(self, ctx: commands.Context):
        """Show all moderator commands."""
        response = (
            f"@{ctx.author.name} MOD COMMANDS: {PREFIX}modgive {PREFIX}modgold {PREFIX}modheal {PREFIX}modlevel "
            f"{PREFIX}modreset {PREFIX}modteleport {PREFIX}modkill {PREFIX}modclear {PREFIX}modstats {PREFIX}modforceboss "
            f"{PREFIX}modsetclass {PREFIX}boss {PREFIX}gameban {PREFIX}gameunban {PREFIX}modhelp"
        )
        await self.send_and_log(ctx, response)


if __name__ == "__main__":
    if not TWITCH_TOKEN:
        print("\n" + "="*60)
        print("ERROR: Missing TWITCH_TOKEN environment variable!")
        print("="*60)
        print("\nTo fix this:")
        print("1. Create a .env file in this directory")
        print("2. Add this line to the .env file:")
        print("   TWITCH_TOKEN=oauth:your_token_here")
        print("3. Get your token from: https://twitchapps.com/tmi/")
        print("4. Install python-dotenv: pip install python-dotenv")
        print("\nAlternatively, set the environment variable in your system.")
        print("="*60)
        exit(1)
    
    channels = load_channels()
    if not channels:
        print("[WARNING] No channels found in Channels.txt!")
        print("Add your channel name to Channels.txt and restart.")
        exit(1)
    
    print(f"[INFO] Starting bot for channels: {', '.join(channels)}")
    sys.stdout.flush()
    
    try:
        bot = AdventureBot(channels)
        bot.run()
    except KeyboardInterrupt:
        print("\n[INFO] Bot stopped by user.")
    except Exception as e:
        print(f"\n[ERROR] Bot crashed: {e}")
        print("This might be a connection issue. Try restarting.")
        sys.stdout.flush()
