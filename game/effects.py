# game/effects.py
from __future__ import annotations
from typing import Dict, List, Optional, TYPE_CHECKING, Callable
import random

if TYPE_CHECKING:
    from .models import Player, Enemy


class EffectProcessor:
    """Handles all item effects and their game mechanics."""
    def __init__(self):
        self.effect_handlers = self._initialize_handlers()

    def calculate_elemental_damage(self, base_damage: int, damage_type: str, enemy: Optional['Enemy']) -> int:
        """Calculate elemental damage considering enemy vulnerabilities and resistances."""
        if not enemy:
            return base_damage

        actual_damage = base_damage

        # Vulnerabilities (bonus damage)
        if hasattr(enemy, 'vulnerabilities') and damage_type in enemy.vulnerabilities:
            actual_damage = int(actual_damage * 1.5)  # +50%

        # Resistances (flat reduce)
        resist_attr = f"{damage_type}_resist"
        if hasattr(enemy, resist_attr):
            resistance = getattr(enemy, resist_attr, 0)
            actual_damage = max(1, actual_damage - resistance)

        return actual_damage

    def _initialize_handlers(self) -> Dict[str, Callable[..., str]]:
        """Initialize all effect handlers (unique keys; no duplicates)."""
        return {
            # === BASIC ===
            "heal": self._effect_heal,
            "damage": self._effect_damage,
            "armor": self._effect_armor,
            "mana": self._effect_mana,
            "max_hp_bonus": self._effect_max_hp_bonus,

            # === TEMPORARY / COMBAT MODS ===
            "damage_buff": self._effect_damage_buff,
            "armor_debuff": self._effect_armor_debuff,
            "dodge": self._effect_dodge,
            "crit_chance": self._effect_crit_chance,
            "block_chance": self._effect_block_chance,
            "life_steal": self._effect_life_steal,
            "pierce": self._effect_pierce,
            "armor_pierce": self._effect_armor_pierce,
            "true_strike": self._effect_true_strike,

            # === STATUS (DOT / CC) ===
            "bleed": self._effect_bleed,
            "burn": self._effect_burn,
            "poison": self._effect_poison,
            "regen": self._effect_regen,
            "stun_chance": self._effect_stun_chance,
            "intimidate": self._effect_intimidate,

            # === ELEMENTAL DIRECT DAMAGE ===
            "fire_damage": self._effect_fire_damage,
            "ice_damage": self._effect_ice_damage,
            "earth_damage": self._effect_earth_damage,
            "lightning": self._effect_lightning,
            "lightning_damage": self._effect_lightning_damage,
            "void_damage": self._effect_void_damage,
            "divine_damage": self._effect_divine_damage,
            "magic_damage": self._effect_magic_damage,
            "undead_damage": self._effect_undead_damage,
            "light_damage": self._effect_light_damage,

            # === RESISTS / DEFENSE ===
            "fire_resist": self._effect_fire_resist,
            "cold_resist": self._effect_cold_resist,
            "magic_resist": self._effect_magic_resist,
            "all_resist": self._effect_all_resist,
            "void_protection": self._effect_void_protection,
            "divine_shield": self._effect_divine_shield,

            # === UTILITY ===
            "stealth": self._effect_stealth,
            "stealth_bonus": self._effect_stealth_bonus,
            "speed_buff": self._effect_speed_buff,
            "escape_chance": self._effect_escape_chance,
            "night_vision": self._effect_night_vision,
            "grip": self._effect_grip,

            # === MAGIC ECONOMY ===
            "mana_regen": self._effect_mana_regen,
            "spell_power": self._effect_spell_power,
            "energy_absorb": self._effect_energy_absorb,
            "reflect": self._effect_reflect,
            "phase_shift": self._effect_phase_shift,

            # === SPECIAL / SUMMONS / TURNS ===
            "extra_turn": self._effect_extra_turn,
            "heal_on_kill": self._effect_heal_on_kill,
            "summon_ally": self._effect_summon_ally,
            "storm_call": self._effect_storm_call,
            "quantum_strike": self._effect_quantum_strike,

            # === STATUS REMOVAL ===
            "cure_poison": self._effect_cure_poison,
            "cure_all": self._effect_cure_all,
            "remove_curse": self._effect_remove_curse,

            # === LEGENDARY / MYTHIC ===
            "resurrect": self._effect_resurrect,
            "immortality": self._effect_immortality,
            "true_immortality": self._effect_true_immortality,
            "infinite_regen": self._effect_infinite_regen,
            "ascend": self._effect_ascend,
            "divine_power": self._effect_divine_power,
            "cosmic_power": self._effect_cosmic_power,
            "omnipotence": self._effect_omnipotence,
            "reality_control": self._effect_reality_control,
            "time_control": self._effect_time_control,
            "time_mastery": self._effect_time_mastery,
            "star_control": self._effect_star_control,
            "multiverse_control": self._effect_multiverse_control,
            "probability_control": self._effect_probability_control,
            "create_world": self._effect_create_world,
            "create_matter": self._effect_create_matter,
            "dimensional_rift": self._effect_dimensional_rift,
            "infinite_knowledge": self._effect_infinite_knowledge,
            "soul_steal": self._effect_soul_steal,
            "energy_body": self._effect_energy_body,
            "ancient_wisdom": self._effect_ancient_wisdom,
            "leadership": self._effect_leadership,
            "flight": self._effect_flight,
            "detect_lies": self._effect_detect_lies,
            "level_bonus": self._effect_level_bonus,
            "immunity": self._effect_immunity,
            "all_stats": self._effect_all_stats,

            # === PHYSICAL ===
            "kick_damage": self._effect_kick_damage,
            "punch_damage": self._effect_punch_damage,
            "hp_drain": self._effect_hp_drain,
        }

    def apply_effect(self, effect_type: str, value: int, player: 'Player',
                     enemy: Optional['Enemy'] = None, duration: Optional[int] = None) -> str:
        """Apply an effect and return the result message."""
        handler = self.effect_handlers.get(effect_type)
        if not handler:
            return f"Unknown effect: {effect_type}"
        try:
            return handler(value, player, enemy, duration)
        except Exception as e:
            return f"Effect {effect_type} failed: {str(e)}"

    # === EFFECT IMPLEMENTATIONS ===

    def _effect_heal(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        old_hp = player.hp
        player.hp = min(player.max_hp, player.hp + value)
        actual_heal = player.hp - old_hp
        return f"healed {actual_heal} HP" if actual_heal > 0 else "already at full health"

    def _effect_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'damage_bonus'):
            player.damage_bonus = 0
        player.damage_bonus += value
        return f"damage increased by {value}"

    def _effect_armor(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'armor_bonus'):
            player.armor_bonus = 0
        player.armor_bonus += value
        return f"armor increased by {value}"

    def _effect_mana(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'mana'):
            player.mana = 0
            player.max_mana = 50
        player.mana = min(player.max_mana, player.mana + value)
        return f"restored {value} mana"

    def _effect_max_hp_bonus(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        player.max_hp += value
        player.hp += value
        return f"max HP increased by {value}"

    def _effect_damage_buff(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'temp_damage_buff'):
            player.temp_damage_buff = 0
            player.temp_damage_duration = 0
        player.temp_damage_buff = max(player.temp_damage_buff, value)
        player.temp_damage_duration = max(player.temp_damage_duration, duration or 5)
        return f"damage boosted by {value} for {duration or 5} turns"

    def _effect_armor_debuff(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'temp_armor_debuff'):
            player.temp_armor_debuff = 0
            player.temp_armor_debuff_duration = 0
        player.temp_armor_debuff = max(player.temp_armor_debuff, value)
        player.temp_armor_debuff_duration = max(player.temp_armor_debuff_duration, duration or 5)
        return f"armor reduced by {value} for {duration or 5} turns"

    def _effect_dodge(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'dodge_bonus'):
            player.dodge_bonus = 0
        player.dodge_bonus += value
        return f"dodge chance increased by {value}%"

    def _effect_bleed(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            enemy.statuses["bleed"] = enemy.statuses.get("bleed", 0) + (duration or 3)
            return f"enemy bleeding for {value} damage over {duration or 3} turns"
        return "no target for bleeding"

    def _effect_fire_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage  # lazy to avoid cycles
            spell_power_bonus = player.get_spell_power() // 2 if hasattr(player, 'get_spell_power') else 0
            boosted = value + spell_power_bonus
            actual = self.calculate_elemental_damage(boosted, "fire", enemy)
            apply_damage(enemy, actual, source="fire")
            suffix = ""
            if spell_power_bonus:
                suffix = f" (+{spell_power_bonus} spell power)"
            if hasattr(enemy, 'vulnerabilities') and "fire" in enemy.vulnerabilities:
                return f"fire damage: {actual} (effective vs {enemy.creature_type}!){suffix}"
            return f"fire damage: {actual}{suffix}"
        return f"fire energy courses through you (+{value} fire power)"

    def _effect_life_steal(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'life_steal'):
            player.life_steal = 0
        player.life_steal += value
        return f"life steal increased by {value}"

    def _effect_stealth(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'stealth_turns'):
            player.stealth_turns = 0
        player.stealth_turns = max(player.stealth_turns, duration or value)
        return f"stealthed for {duration or value} turns"

    def _effect_resurrect(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'resurrect_charges'):
            player.resurrect_charges = 0
        player.resurrect_charges += value
        return f"gained {value} resurrection charge(s)"

    def _effect_escape_chance(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'escape_bonus'):
            player.escape_bonus = 0
        player.escape_bonus += value
        return f"escape chance increased by {value}%"

    def _effect_spell_power(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'spell_power'):
            player.spell_power = 0
        player.spell_power += value
        if player.clazz == "mage" and hasattr(player, 'get_spell_power'):
            return f"spell power increased by {value} (total spell power: {player.get_spell_power()})"
        return f"spell power increased by {value}"

    def _effect_mana_regen(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'mana_regen'):
            player.mana_regen = 0
        player.mana_regen += value
        return f"mana regeneration increased by {value}"

    def _effect_crit_chance(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'crit_chance'):
            player.crit_chance = 0
        player.crit_chance += value
        return f"critical hit chance increased by {value}%"
    
    def _effect_true_strike(self, ctx):
        """
        Safe no-op fallback for 'true_strike' effect.
        ctx: dict-like effect context (attacker, defender, stacks, value, etc.)
        Returns the (possibly) modified ctx or a standard effect result.
        """
        ctx.setdefault("logs", []).append("Effect 'true_strike' (noop).")
        return ctx
    
    def _effect_block_chance(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'block_chance'):
            player.block_chance = 0
        player.block_chance += value
        return f"block chance increased by {value}%"

    def _effect_fire_resist(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'fire_resist'):
            player.fire_resist = 0
        player.fire_resist += value
        return f"fire resistance increased by {value}%"

    def _effect_ice_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        """Deal ice/frost damage and minor freeze chance."""
        if enemy:
            from .engine import apply_damage
            actual = self.calculate_elemental_damage(value, "ice", enemy)
            apply_damage(enemy, actual, source="ice")
            if random.random() < 0.3:
                enemy.statuses["frozen"] = 1
            if hasattr(enemy, 'vulnerabilities') and "ice" in enemy.vulnerabilities:
                return f"frost damage: {actual} (effective vs {enemy.creature_type}!)"
            return f"frost damage: {actual}"
        return f"frost energy surrounds you"

    def _effect_earth_damage (self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        """Deal earth damage and minor stun chance."""
        if enemy:
            from .engine import apply_damage
            actual = self.calculate_elemental_damage(value, "earth", enemy)
            apply_damage(enemy, actual, source="earth")
            if random.random() < 0.3:
                enemy.statuses["stunned"] = 1
            if hasattr(enemy, 'vulnerabilities') and "earth" in enemy.vulnerabilities:
                return f"earth damage: {actual} (effective vs {enemy.creature_type}!)"
            return f"earth damage: {actual}"
        return f"earth energy surrounds you"

    def _effect_lightning_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            apply_damage(enemy, value, source="lightning")
            if random.random() < 0.2:
                enemy.statuses["stunned"] = 1
            return f"lightning damage: {value}"
        return f"lightning crackles around you"

    def _effect_burn(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            enemy.statuses["burn"] = enemy.statuses.get("burn", 0) + (duration or 3)
            return f"enemy burning for {value} damage over {duration or 3} turns"
        return "flames surround you harmlessly"

    def _effect_poison(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            enemy.statuses["poison"] = enemy.statuses.get("poison", 0) + (duration or 3)
            return f"enemy poisoned for {value} damage over {duration or 3} turns"
        return "you build poison immunity"

    def _effect_regen(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'regen'):
            player.regen = 0
        player.regen += value
        return f"regeneration increased by {value} HP per turn"

    def _effect_cure_poison(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if hasattr(player, 'statuses') and "poison" in player.statuses:
            del player.statuses["poison"]
            return "poison cured"
        return "no poison to cure"

    def _effect_cure_all(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if hasattr(player, 'statuses'):
            count = len(player.statuses)
            player.statuses.clear()
            return f"all {count} status effects cured"
        return "no status effects to cure"

    def _effect_remove_curse(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if hasattr(player, 'statuses') and "cursed" in player.statuses:
            del player.statuses["cursed"]
            return "curse removed"
        return "no curse to remove"

    def _effect_lightning(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            apply_damage(enemy, value, source="lightning")
            return f"lightning strikes for {value} damage"
        return "lightning power builds within you"

    def _effect_pierce(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'pierce'):
            player.pierce = 0
        player.pierce += value
        return f"attacks now pierce armor"

    def _effect_armor_pierce(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'armor_pierce'):
            player.armor_pierce = 0
        player.armor_pierce += value
        return f"armor piercing increased by {value}"

    def _effect_stun_chance(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'stun_chance'):
            player.stun_chance = 0
        player.stun_chance += value
        return f"stun chance increased by {value}%"

    def _effect_intimidate(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            enemy.statuses["intimidated"] = duration or 3
            return f"enemy intimidated for {duration or 3} turns"
        return "you look more intimidating"

    def _effect_speed_buff(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'speed_buff'):
            player.speed_buff = 0
        player.speed_buff = max(player.speed_buff, value)
        return f"speed increased by {value} for {duration or 5} turns"

    def _effect_reflect(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'reflect_chance'):
            player.reflect_chance = 0
        player.reflect_chance += value
        return f"magic reflection increased by {value}%"

    def _effect_stealth_bonus(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'stealth_bonus'):
            player.stealth_bonus = 0
        player.stealth_bonus += value
        return f"stealth effectiveness increased by {value}%"

    def _effect_night_vision(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'night_vision'):
            player.night_vision = False
        player.night_vision = True
        return "gained night vision"

    def _effect_grip(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'grip_strength'):
            player.grip_strength = 0
        player.grip_strength += value
        return f"grip strength increased by {value}"

    def _effect_cold_resist(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'cold_resist'):
            player.cold_resist = 0
        player.cold_resist += value
        return f"cold resistance increased by {value}%"

    def _effect_magic_resist(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'magic_resist'):
            player.magic_resist = 0
        player.magic_resist += value
        return f"magic resistance increased by {value}%"

    def _effect_all_resist(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        for resist in ['fire_resist', 'cold_resist', 'magic_resist']:
            if not hasattr(player, resist):
                setattr(player, resist, 0)
            setattr(player, resist, getattr(player, resist) + value)
        return f"all resistances increased by {value}%"
    
    def _effect_void_protection(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        for resist in ['void_resist']:
            if not hasattr(player, resist):
                setattr(player, resist, 0)
            setattr(player, resist, getattr(player, resist) + value)
        return f"void resistances increased by {value}%"

    def _effect_energy_absorb(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'energy_absorb'):
            player.energy_absorb = 0
        player.energy_absorb += value
        return f"energy absorption increased by {value}%"

    def _effect_phase_shift(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'phase_shift_chance'):
            player.phase_shift_chance = 0
        player.phase_shift_chance += value
        return f"phase shift chance increased by {value}%"

    def _effect_extra_turn(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'extra_turns'):
            player.extra_turns = 0
        player.extra_turns += value
        return f"gained {value} extra turn(s)"

    def _effect_heal_on_kill(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'heal_on_kill'):
            player.heal_on_kill = 0
        player.heal_on_kill += value
        return f"heal {value} HP on each kill"

    def _effect_summon_ally(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'summoned_ally'):
            player.summoned_ally = None
        player.summoned_ally = {"hp": 10 + player.level * 2, "damage": 3 + player.level}
        return "summoned a spirit ally"

    def _effect_storm_call(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            storm_damage = value + random.randint(5, 15)
            apply_damage(enemy, storm_damage, source="storm")
            return f"storm called down for {storm_damage} damage"
        return "storm clouds gather around you"

    def _effect_void_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            apply_damage(enemy, value, source="void")
            return f"void damage: {value} (ignores all defense)"
        return "void energy flows through you"

    def _effect_divine_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        """Divine damage; bonus vs demons/undead and dark affinity."""
        if enemy:
            from .engine import apply_damage
            actual = self.calculate_elemental_damage(value, "divine", enemy)
            if getattr(enemy, 'creature_type', None) in ["demon", "undead"]:
                actual = int(actual * 1.5)
            if getattr(enemy, 'affinity', None) in ["darkness", "void"]:
                actual = int(actual * 1.3)
            apply_damage(enemy, actual, source="divine")
            if hasattr(enemy, 'vulnerabilities') and "divine" in enemy.vulnerabilities:
                return f"divine wrath: {actual} (very effective vs {enemy.creature_type}!)"
            if getattr(enemy, 'creature_type', None) in ["demon", "undead"]:
                return f"divine wrath: {actual} (devastating vs evil!)"
            return f"divine power: {actual}"
        return "divine power flows through you"

    def _effect_quantum_strike(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            damage = random.randint(value, value * 3)
            apply_damage(enemy, damage, source="quantum")
            return f"quantum strike across {random.randint(2,5)} realities: {damage} damage"
        return "you exist in quantum superposition"

    def _effect_immortality(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'immortal_turns'):
            player.immortal_turns = 0
        player.immortal_turns = max(player.immortal_turns, value)
        return f"gained immortality for {value} turns"

    def _effect_true_immortality(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'true_immortal'):
            player.true_immortal = False
        player.true_immortal = True
        return "gained TRUE IMMORTALITY - death is impossible"

    def _effect_ascend(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'ascended'):
            player.ascended = False
        player.ascended = True
        player.max_hp += 1000
        player.hp = player.max_hp
        return "ASCENDED TO GODHOOD - all stats massively increased"

    def _effect_divine_power(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'divine_power'):
            player.divine_power = 0
        player.divine_power += value
        return f"divine power increased by {value}"

    def _effect_cosmic_power(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'cosmic_power'):
            player.cosmic_power = False
        player.cosmic_power = True
        return "gained COSMIC POWER - control over universal forces"

    def _effect_omnipotence(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'omnipotent'):
            player.omnipotent = False
        player.omnipotent = True
        return "achieved OMNIPOTENCE - unlimited power over reality"

    def _effect_reality_control(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'reality_control'):
            player.reality_control = False
        player.reality_control = True
        return "gained control over REALITY itself"

    def _effect_time_control(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'time_control'):
            player.time_control = False
        player.time_control = True
        return "gained control over TIME"

    def _effect_time_mastery(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'time_master'):
            player.time_master = False
        player.time_master = True
        return "achieved TIME MASTERY - complete temporal control"

    def _effect_star_control(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'star_control'):
            player.star_control = False
        player.star_control = True
        return "gained control over STARS and celestial bodies"

    def _effect_multiverse_control(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'multiverse_control'):
            player.multiverse_control = False
        player.multiverse_control = True
        return "gained control over the MULTIVERSE"

    def _effect_probability_control(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'luck_bonus'):
            player.luck_bonus = 0
        player.luck_bonus += value
        return f"probability manipulation increased by {value}%"

    def _effect_create_world(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'worlds_created'):
            player.worlds_created = 0
        player.worlds_created += value
        return f"gained power to CREATE {value} WORLD(S)"

    def _effect_create_matter(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'matter_creation'):
            player.matter_creation = False
        player.matter_creation = True
        return "gained power to CREATE MATTER from nothing"

    def _effect_dimensional_rift(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'dimensional_power'):
            player.dimensional_power = False
        player.dimensional_power = True
        return "can now tear DIMENSIONAL RIFTS in space"

    def _effect_infinite_knowledge(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'infinite_knowledge'):
            player.infinite_knowledge = False
        player.infinite_knowledge = True
        return "gained INFINITE KNOWLEDGE of all things"

    def _effect_infinite_regen(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'infinite_regen'):
            player.infinite_regen = False
        player.infinite_regen = True
        return "gained INFINITE REGENERATION"

    def _effect_soul_steal(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'soul_steal'):
            player.soul_steal = 0
        player.soul_steal += value
        return f"soul stealing power increased by {value}"

    def _effect_energy_body(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'energy_body'):
            player.energy_body = False
        player.energy_body = True
        return "body transformed into pure ENERGY"

    def _effect_ancient_wisdom(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'ancient_wisdom'):
            player.ancient_wisdom = False
        player.ancient_wisdom = True
        return "gained wisdom of the ANCIENTS"

    def _effect_leadership(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'leadership'):
            player.leadership = 0
        player.leadership += value
        return "leadership abilities increased"

    def _effect_flight(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'can_fly'):
            player.can_fly = False
        player.can_fly = True
        return "gained the power of FLIGHT"

    def _effect_detect_lies(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'detect_lies'):
            player.detect_lies = False
        player.detect_lies = True
        return "can now detect all lies and deception"

    def _effect_level_bonus(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        player.level += value
        player.max_hp += value * 3
        return f"gained {value} levels instantly"

    def _effect_immunity(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'immunity'):
            player.immunity = 0
        player.immunity = max(player.immunity, value)
        return f"gained {value}% immunity to all damage"

    def _effect_all_stats(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'stat_bonus'):
            player.stat_bonus = 0
        player.stat_bonus += value
        return f"ALL STATS increased by {value}"

    def _effect_kick_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'kick_damage'):
            player.kick_damage = 0
        player.kick_damage += value
        return f"kick attacks deal +{value} damage"

    def _effect_punch_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'punch_damage'):
            player.punch_damage = 0
        player.punch_damage += value
        return f"punch attacks deal +{value} damage"

    def _effect_hp_drain(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'hp_drain_per_turn'):
            player.hp_drain_per_turn = 0
        player.hp_drain_per_turn += value
        return f"WARNING: losing {value} HP per turn"

    def _effect_divine_shield(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'divine_shield'):
            player.divine_shield = 0
        player.divine_shield = max(player.divine_shield, value)
        return f"divine shield absorbs {value} damage"

    def _effect_magic_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if not hasattr(player, 'magic_damage_bonus'):
            player.magic_damage_bonus = 0
        player.magic_damage_bonus += value
        if player.clazz == "mage" and hasattr(player, 'get_magic_damage_bonus'):
            return f"magic damage increased by {value} (total magic bonus: {player.get_magic_damage_bonus()})"
        return f"magic damage increased by {value}"

    def _effect_undead_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            if getattr(enemy, 'creature_type', None) == "undead":
                actual = int(value * 2)
                apply_damage(enemy, actual, source="undead_bane")
                return f"UNDEAD SLAYING: {actual} bonus damage (devastating vs undead!)"
            return f"weapon glows but has no effect vs {getattr(enemy, 'creature_type', 'unknown')}"
        return f"prepared to deal +{value} damage to undead"

    def _effect_light_damage(self, value: int, player: 'Player', enemy: Optional['Enemy'], duration: Optional[int]) -> str:
        if enemy:
            from .engine import apply_damage
            sp_bonus = player.get_spell_power() // 2 if hasattr(player, 'get_spell_power') else 0
            boosted = value + sp_bonus
            actual = self.calculate_elemental_damage(boosted, "light", enemy)
            if getattr(enemy, 'affinity', None) in ["darkness", "void"]:
                actual = int(actual * 1.3)
            if getattr(enemy, 'creature_type', None) == "undead":
                actual = int(actual * 1.3)
            apply_damage(enemy, actual, source="light")

            if sp_bonus:
                if hasattr(enemy, 'vulnerabilities') and "light" in enemy.vulnerabilities:
                    return f"holy light: {actual} damage (very effective vs {enemy.creature_type}! +{sp_bonus} spell power)"
                if getattr(enemy, 'affinity', None) in ["darkness", "void"]:
                    return f"holy light: {actual} damage (effective vs darkness! +{sp_bonus} spell power)"
                return f"holy light: {actual} damage (+{sp_bonus} spell power)"
            else:
                if hasattr(enemy, 'vulnerabilities') and "light" in enemy.vulnerabilities:
                    return f"holy light: {actual} damage (very effective vs {enemy.creature_type}!)"
                if getattr(enemy, 'affinity', None) in ["darkness", "void"]:
                    return f"holy light: {actual} damage (effective vs darkness!)"
                return f"holy light: {actual} damage"
        return "holy light surrounds you"


# Global effect processor
EFFECT_PROCESSOR = EffectProcessor()


def apply_item_effects(item_name: str, player: 'Player', enemy: Optional['Enemy'] = None) -> List[str]:
    """Apply all effects from an item."""
    from .items import get_item  # lazy import
    item = get_item(item_name)
    if not item:
        return [f"Unknown item: {item_name}"]

    results = []
    for effect in item.effects:
        results.append(EFFECT_PROCESSOR.apply_effect(effect.type, effect.value, player, enemy, effect.duration))
    return results