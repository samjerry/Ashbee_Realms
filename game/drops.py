from __future__ import annotations
import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum

from .items import Item, ItemRarity, get_items_by_rarity, get_item

EPS = 1e-9

def _normalize_probs(d: dict[str, float]) -> dict[str, float]:
    # Clamp negatives up to zero, then normalize. If sum is 0, spread uniformly.
    keys = list(d.keys())
    vals = [max(0.0, float(d[k])) for k in keys]
    s = sum(vals)
    if s <= EPS:
        # avoid division by zero: uniform distribution
        u = 1.0 / len(keys)
        return {k: u for k in keys}
    return {k: v / s for k, v in zip(keys, vals)}


class DropSource(Enum):
    """Different sources that can drop items."""
    MOB_KILL = "mob_kill"
    BOSS_KILL = "boss_kill"
    EXPLORATION = "exploration"
    CHEST_COMMON = "chest_common"
    CHEST_UNCOMMON = "chest_uncommon"
    CHEST_RARE = "chest_rare"
    CHEST_EPIC = "chest_epic"
    QUEST_REWARD = "quest_reward"
    DAILY_REWARD = "daily_reward"

@dataclass
class DropTable:
    common_chance: float
    uncommon_chance: float = 0.0  # <-- add this field
    rare_chance: float = 0.0
    epic_chance: float = 0.0
    legendary_chance: float = 0.0
    mythic_chance: float = 0.0
    no_drop_chance: float = 0.0

    def __post_init__(self):
        # Normalize with small FP tolerance so tables never fail validation
        fields = [
            "common_chance", "uncommon_chance", "rare_chance",
            "epic_chance", "legendary_chance", "mythic_chance", "no_drop_chance"
        ]
        probs = {f: max(0.0, float(getattr(self, f))) for f in fields}
        total = sum(probs.values())
        if abs(total - 1.0) > 1e-6:
            probs = _normalize_probs(probs)
            total = sum(probs.values())
            if abs(total - 1.0) > 1e-6:
                raise ValueError(f"Drop chances must sum to 1.0, got {total}")
        for f in fields:
            setattr(self, f, probs[f])

@dataclass
class LevelScaling:
    """How drop chances scale with player level."""
    base_level: int = 1
    uncommon_boost_per_level: float = 0.007     # 0.7% increase per level
    rare_boost_per_level: float = 0.003         # 0.3% increase per level
    epic_boost_per_level: float = 0.001         # 0.1% increase per level
    legendary_boost_per_level: float = 0.0003   # 0.03% increase per level
    mythic_boost_per_level: float = 0.00005     # 0.005% increase per level
    max_level_bonus: int = 30                   # Cap scaling at level 30

class DropSystem:
    """Comprehensive drop system with weighted probabilities and scaling."""
    
    def __init__(self):
        # Pre-calculate item lists by rarity for performance
        self.common_items = [item.name for item in get_items_by_rarity(ItemRarity.COMMON)]
        self.uncommon_items = [item.name for item in get_items_by_rarity(ItemRarity.UNCOMMON)]
        self.rare_items = [item.name for item in get_items_by_rarity(ItemRarity.RARE)]
        self.epic_items = [item.name for item in get_items_by_rarity(ItemRarity.EPIC)]
        self.legendary_items = [item.name for item in get_items_by_rarity(ItemRarity.LEGENDARY)]
        self.mythic_items = [item.name for item in get_items_by_rarity(ItemRarity.MYTHIC)]
        
        # Define drop tables for different sources
        self.drop_tables = self._initialize_drop_tables()
        self.scaling = LevelScaling()
    
    def _initialize_drop_tables(self) -> Dict[DropSource, DropTable]:
        """Initialize all drop tables with balanced probabilities."""
        return {
            DropSource.MOB_KILL: DropTable(
                common_chance=0.50,
                uncommon_chance=0.20,
                rare_chance=0.15,
                epic_chance=0.05,
                legendary_chance=0.005,
                mythic_chance=0.0001,
                no_drop_chance=0.0949
            ),

            DropSource.BOSS_KILL: DropTable(
                common_chance=0.22,
                uncommon_chance=0.24,
                rare_chance=0.34,
                epic_chance=0.15,
                legendary_chance=0.04,
                mythic_chance=0.01,
                no_drop_chance=0.0
            ),

            DropSource.EXPLORATION: DropTable(
                common_chance=0.58,
                uncommon_chance=0.14,
                rare_chance=0.18,
                epic_chance=0.08,
                legendary_chance=0.002,
                mythic_chance=0.00005,
                no_drop_chance=0.01795
            ),

            DropSource.CHEST_COMMON: DropTable(
                common_chance=0.70,
                uncommon_chance=0.15,
                rare_chance=0.14,
                epic_chance=0.01,
                legendary_chance=0.0,
                mythic_chance=0.0,
                no_drop_chance=0.0
            ),

            DropSource.CHEST_UNCOMMON: DropTable(
                common_chance=0.55,
                uncommon_chance=0.30,
                rare_chance=0.12,
                epic_chance=0.03,
                legendary_chance=0.0,
                mythic_chance=0.0,
                no_drop_chance=0.0
            ),

            DropSource.CHEST_RARE: DropTable(
                common_chance=0.30,
                uncommon_chance=0.20,
                rare_chance=0.40,
                epic_chance=0.09,
                legendary_chance=0.01,
                mythic_chance=0.0,
                no_drop_chance=0.0
            ),

            DropSource.CHEST_EPIC: DropTable(
                common_chance=0.10,
                uncommon_chance=0.18,
                rare_chance=0.36,
                epic_chance=0.30,
                legendary_chance=0.05,
                mythic_chance=0.01,
                no_drop_chance=0.0
            ),

            DropSource.QUEST_REWARD: DropTable(
                common_chance=0.15,
                uncommon_chance=0.15,
                rare_chance=0.395,
                epic_chance=0.25,
                legendary_chance=0.05,
                mythic_chance=0.005,
                no_drop_chance=0.0
            ),

            DropSource.DAILY_REWARD: DropTable(
                common_chance=0.37,
                uncommon_chance=0.18,
                rare_chance=0.29,
                epic_chance=0.12,
                legendary_chance=0.03,
                mythic_chance=0.01,
                no_drop_chance=0.0
            )
        }
    
    def calculate_scaled_chances(self, base_table: DropTable, player_level: int) -> DropTable:
        """Calculate level-scaled drop chances, then normalize once."""
        level_bonus = min(max(0, player_level - self.scaling.base_level), self.scaling.max_level_bonus)
        if level_bonus <= 0:
            # Already normalized by __post_init__
            return base_table

        # Compute bonuses (including UNCOMMON)
        uncommon_bonus  = level_bonus * self.scaling.uncommon_boost_per_level
        rare_bonus      = level_bonus * self.scaling.rare_boost_per_level
        epic_bonus      = level_bonus * self.scaling.epic_boost_per_level
        legendary_bonus = level_bonus * self.scaling.legendary_boost_per_level
        mythic_bonus    = level_bonus * self.scaling.mythic_boost_per_level

        # Apply caps to high rarities (keep your DropConfig caps if desired)
        capped = {
            "uncommon_chance": base_table.uncommon_chance + uncommon_bonus,
            "rare_chance":      min(0.80, base_table.rare_chance + rare_bonus),
            "epic_chance":      min(0.40, base_table.epic_chance + epic_bonus),
            "legendary_chance": min(0.20, base_table.legendary_chance + legendary_bonus),
            "mythic_chance":    min(0.05, base_table.mythic_chance + mythic_bonus),
        }

        # Compute how much we actually increased (post-cap), and take it from common
        actual_increase = (
            (capped["uncommon_chance"]  - base_table.uncommon_chance) +
            (capped["rare_chance"]      - base_table.rare_chance) +
            (capped["epic_chance"]      - base_table.epic_chance) +
            (capped["legendary_chance"] - base_table.legendary_chance) +
            (capped["mythic_chance"]    - base_table.mythic_chance)
        )

        new_common = max(0.05, base_table.common_chance - actual_increase)

        # Build full dict (keep no_drop as baseline; normalize will fix tiny drift)
        scaled = {
            "common_chance":    new_common,
            "uncommon_chance":  capped["uncommon_chance"],
            "rare_chance":      capped["rare_chance"],
            "epic_chance":      capped["epic_chance"],
            "legendary_chance": capped["legendary_chance"],
            "mythic_chance":    capped["mythic_chance"],
            "no_drop_chance":   base_table.no_drop_chance,
        }

        scaled = _normalize_probs(scaled)
        return DropTable(**scaled)

    
    def roll_rarity(self, source: DropSource, player_level: int = 1) -> Optional[ItemRarity]:
        """Roll for item rarity based on source and player level (normalized)."""
        base_table = self.drop_tables[source]
        t = self.calculate_scaled_chances(base_table, player_level)  # already normalized
        roll = random.random()

        thresholds = [
            (t.mythic_chance, ItemRarity.MYTHIC),
            (t.legendary_chance, ItemRarity.LEGENDARY),
            (t.epic_chance, ItemRarity.EPIC),
            (t.rare_chance, ItemRarity.RARE),
            (t.uncommon_chance, ItemRarity.UNCOMMON),
            (t.common_chance, ItemRarity.COMMON),
        ]

        acc = 0.0
        for p, r in thresholds:
            acc += p
            if roll < acc:
                return r
        return None
    
    def get_random_item_by_rarity(self, rarity: ItemRarity) -> Optional[str]:
        """Get a random item name of the specified rarity."""
        if rarity == ItemRarity.COMMON:
            return random.choice(self.common_items) if self.common_items else None
        elif rarity == ItemRarity.UNCOMMON:
            return random.choice(self.uncommon_items) if self.uncommon_items else None
        elif rarity == ItemRarity.RARE:
            return random.choice(self.rare_items) if self.rare_items else None
        elif rarity == ItemRarity.EPIC:
            return random.choice(self.epic_items) if self.epic_items else None
        elif rarity == ItemRarity.LEGENDARY:
            return random.choice(self.legendary_items) if self.legendary_items else None
        elif rarity == ItemRarity.MYTHIC:
            return random.choice(self.mythic_items) if self.mythic_items else None
        return None

    
    def generate_drop(self, source: DropSource, player_level: int = 1, exclude_items: List[str] = None) -> Optional[str]:
        """Generate a single item drop."""
        rarity = self.roll_rarity(source, player_level)
        if not rarity:
            return None
            
        exclude_items = exclude_items or []
        
        # Get available items of this rarity
        if rarity == ItemRarity.COMMON:
            available = [item for item in self.common_items if item not in exclude_items]
        if rarity == ItemRarity.UNCOMMON:
            available = [item for item in self.uncommon_items if item not in exclude_items]
        elif rarity == ItemRarity.RARE:
            available = [item for item in self.rare_items if item not in exclude_items]
        elif rarity == ItemRarity.EPIC:
            available = [item for item in self.epic_items if item not in exclude_items]
        elif rarity == ItemRarity.LEGENDARY:
            available = [item for item in self.legendary_items if item not in exclude_items]
        elif rarity == ItemRarity.MYTHIC:
            available = [item for item in self.mythic_items if item not in exclude_items]
        else:
            available = []
            
        return random.choice(available) if available else None
    
    def generate_multiple_drops(self, source: DropSource, count: int, player_level: int = 1) -> List[str]:
        """Generate multiple drops, avoiding duplicates where possible."""
        drops = []
        excluded = []
        
        for _ in range(count):
            drop = self.generate_drop(source, player_level, excluded)
            if drop:
                drops.append(drop)
                # Only exclude non-stackable items
                item = get_item(drop)
                if item and not item.stackable:
                    excluded.append(drop)
        
        return drops
    
    def get_drop_statistics(self, source: DropSource, player_level: int = 1, trials: int = 10000) -> Dict[str, float]:
        """Get statistical drop rates for testing/balancing."""
        results = {
            "no_drop": 0,
            "common": 0,
            "uncommon": 0,
            "rare": 0,
            "epic": 0,
            "legendary": 0,
            "mythic": 0
        }
        
        for _ in range(trials):
            rarity = self.roll_rarity(source, player_level)
            if rarity is None:
                results["no_drop"] += 1
            else:
                results[rarity.value] += 1
        
        # Convert to percentages
        return {k: (v / trials) * 100 for k, v in results.items()}

# Global drop system instance
DROP_SYSTEM = DropSystem()

# Convenience functions for easy integration
def get_mob_drop(player_level: int = 1) -> Optional[str]:
    """Get a random mob drop."""
    return DROP_SYSTEM.generate_drop(DropSource.MOB_KILL, player_level)

def get_boss_drop(player_level: int = 1) -> Optional[str]:
    """Get a random boss drop."""
    return DROP_SYSTEM.generate_drop(DropSource.BOSS_KILL, player_level)

def get_exploration_drop(player_level: int = 1) -> Optional[str]:
    """Get a random exploration drop."""
    return DROP_SYSTEM.generate_drop(DropSource.EXPLORATION, player_level)

def get_chest_drops(chest_type: str, player_level: int = 1, count: int = 1) -> List[str]:
    """Get drops from a chest."""
    source_map = {
        "common": DropSource.CHEST_COMMON,
        "uncommon": DropSource.CHEST_UNCOMMON,
        "rare": DropSource.CHEST_RARE,
        "epic": DropSource.CHEST_EPIC
    }
    source = source_map.get(chest_type.lower(), DropSource.CHEST_COMMON)
    return DROP_SYSTEM.generate_multiple_drops(source, count, player_level)

def get_quest_reward(player_level: int = 1) -> Optional[str]:
    """Get a quest reward drop."""
    return DROP_SYSTEM.generate_drop(DropSource.QUEST_REWARD, player_level)

# Drop configuration constants for easy tweaking
class DropConfig:
    """Configuration constants for drop system."""
    
    # Base chances for mob drops
    MOB_DROP_BASE_CHANCE = 0.905  # 90.5% chance to get something
    
    # Boss always drops, but can drop multiple items
    BOSS_MULTI_DROP_CHANCE = 0.30  # 30% chance for second item
    BOSS_RARE_MULTI_DROP_CHANCE = 0.10  # 10% chance for third item
    
    # Exploration event drop rates
    EXPLORATION_GOLD_VS_ITEM_RATIO = 0.6  # 60% gold, 40% item
    
    # Level scaling caps
    MAX_LEGENDARY_CHANCE = 0.15  # Never exceed 15% legendary chance
    MAX_EPIC_CHANCE = 0.35       # Never exceed 35% epic chance
    
    # Special event multipliers
    DOUBLE_DROP_EVENT_CHANCE = 0.05  # 5% chance during events
    LUCKY_DAY_MULTIPLIER = 1.5       # 1.5x all rare+ chances
