from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum

class ItemType(Enum):
    CONSUMABLE = "consumable"
    WEAPON = "weapon"
    ARMOR = "armor"
    MISC = "misc"

class ItemRarity(Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare" 
    EPIC = "epic"
    LEGENDARY = "legendary"
    MYTHIC = "mythic"

@dataclass
class ItemEffect:
    """Represents an effect an item can have."""
    type: str  # "heal", "damage", "buff", etc.
    value: int
    duration: Optional[int] = None  # For temporary effects

class ItemSubType(Enum):
    # Equipment slots
    HEADGEAR = "headgear"
    ARMOR = "armor" 
    LEGS = "legs"
    FOOTWEAR = "footwear"
    HANDS = "hands"
    CAPE = "cape"
    OFF_HAND = "off-hand"
    AMULET = "amulet"
    RING = "ring"
    BELT = "belt"
    MAIN_HAND = "main-hand"
    TRINKET = "trinket"
    RELIC = "relic"
    # Non-equipment
    CONSUMABLE = "consumable"
    MATERIAL = "material"

@dataclass
class Item:
    """Represents a game item with properties and effects."""
    name: str
    type: ItemType
    sub_type: ItemSubType
    rarity: ItemRarity
    description: str
    effects: List[ItemEffect]
    value: int = 0  # Gold value
    stackable: bool = True
    usable: bool = False

    def can_use(self, player) -> bool:
        """Check if player can use this item."""
        return self.usable and self.type == ItemType.CONSUMABLE

    def use(self, player) -> str:
        """Use the item on a player and return result message."""
        if not self.can_use(player):
            return f"Cannot use {self.name}."
        
        messages = []
        for effect in self.effects:
            if effect.type == "heal":
                heal_amount = min(effect.value, player.max_hp - player.hp)
                player.hp += heal_amount
                messages.append(f"healed {heal_amount} HP")
            elif effect.type == "mana":
                messages.append(f"restored {effect.value} mana")
        
        return f"You use {self.name} and " + ", ".join(messages) + "."

# === ITEM DATABASE ===
ITEMS: Dict[str, Item] = {
    "Potion": Item(
        name="Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="A basic healing potion.", effects=[ItemEffect("heal", 6)], value=3, usable=True
    ),
    "Herb": Item(
        name="Herb", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A common herb found in the wild.", effects=[], value=1
    ),
    "Bandage": Item(
        name="Bandage", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Stops bleeding and heals minor wounds.", effects=[ItemEffect("heal", 3)], value=2, usable=True
    ),
    "Bread": Item(
        name="Bread", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Stale bread that provides minor healing.", effects=[ItemEffect("heal", 2)], value=1, usable=True
    ),
    "Coin": Item(
        name="Coin", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A simple copper coin.", effects=[], value=2
    ),
    "Feather": Item(
        name="Feather", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A light feather from a forest bird.", effects=[], value=1
    ),
    "Stone": Item(
        name="Stone", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A smooth river stone.", effects=[], value=1
    ),
    "Stick": Item(
        name="Stick", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="A simple wooden stick.", effects=[ItemEffect("damage", 1)], value=2, stackable=False
    ),
    "Rope": Item(
        name="Rope", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Useful rope for various purposes.", effects=[], value=3
    ),
    "Torch": Item(
        name="Torch", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Provides light in dark places.", effects=[], value=2
    ),
    "Apple": Item(
        name="Apple", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="A crisp red apple.", effects=[ItemEffect("heal", 2)], value=1, usable=True
    ),
    "Water Flask": Item(
        name="Water Flask", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Clean water that refreshes you.", effects=[ItemEffect("heal", 1)], value=1, usable=True
    ),
    "Copper Ore": Item(
        name="Copper Ore", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Raw copper that can be smelted.", effects=[], value=3
    ),
    "Iron Ore": Item(
        name="Iron Ore", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Valuable iron ore.", effects=[], value=5
    ),
    "Clay": Item(
        name="Clay", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Soft clay for crafting.", effects=[], value=2
    ),
    "Bone": Item(
        name="Bone", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A weathered animal bone.", effects=[], value=2
    ),
    "Mushroom": Item(
        name="Mushroom", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="An edible forest mushroom.", effects=[ItemEffect("heal", 1)], value=1, usable=True
    ),
    "Berry": Item(
        name="Berry", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Sweet wild berries.", effects=[ItemEffect("heal", 1)], value=1, usable=True
    ),
    "Wooden Shield": Item(
        name="Wooden Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="A basic wooden shield.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Cloth": Item(
        name="Cloth", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Simple woven cloth.", effects=[], value=2
    ),
    "Needle": Item(
        name="Needle", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A sharp sewing needle.", effects=[], value=1
    ),
    "Thread": Item(
        name="Thread", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Strong thread for sewing.", effects=[], value=1
    ),
    "Salt": Item(
        name="Salt", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Precious salt for preserving food.", effects=[], value=4
    ),
    "Candle": Item(
        name="Candle", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A wax candle for light.", effects=[], value=2
    ),
    "Flint": Item(
        name="Flint", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Creates sparks to start fires.", effects=[], value=3
    ),
    "Wooden Sword": Item(
        name="Wooden Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="A crude wooden training sword.", effects=[ItemEffect("damage", 2)], value=5, stackable=False
    ),
    "Leather Boots": Item(
        name="Leather Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Basic leather footwear.", effects=[ItemEffect("dodge", 5)], value=6, stackable=False
    ),
    "Rusty Knife": Item(
        name="Rusty Knife", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="An old, worn blade.", effects=[ItemEffect("damage", 1)], value=3, stackable=False
    ),
    "Torn Map": Item(
        name="Torn Map", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A partially readable old map.", effects=[], value=4
    ),
    "Fish": Item(
        name="Fish", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Fresh caught fish.", effects=[ItemEffect("heal", 3)], value=2, usable=True
    ),
    "Empty Bottle": Item(
        name="Empty Bottle", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Could be useful for storing liquids.", effects=[], value=1
    ),
    "Pebble": Item(
        name="Pebble", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A small smooth pebble.", effects=[], value=1
    ),
    "Branch": Item(
        name="Branch", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A sturdy tree branch.", effects=[], value=2
    ),
    "Flower": Item(
        name="Flower", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A pretty wildflower.", effects=[], value=1
    ),
    "Leather Scraps": Item(
        name="Leather Scraps", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Pieces of worn leather.", effects=[], value=2
    ),
    "Broken Arrow": Item(
        name="Broken Arrow", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="The remains of an old arrow.", effects=[], value=1
    ),
    "Wood Chips": Item(
        name="Wood Chips", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Small pieces of carved wood.", effects=[], value=1
    ),
    "Dirty Cloth": Item(
        name="Dirty Cloth", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A stained piece of fabric.", effects=[], value=1
    ),
    "Rusty Nail": Item(
        name="Rusty Nail", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="An old iron nail.", effects=[], value=1
    ),
    "Acorn": Item(
        name="Acorn", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="A nutritious tree nut.", effects=[ItemEffect("heal", 1)], value=1, usable=True
    ),
    "Bark": Item(
        name="Bark", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Tree bark with medicinal properties.", effects=[], value=2
    ),
    "Smooth Stone": Item(
        name="Smooth Stone", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A perfectly rounded stone.", effects=[], value=2
    ),
    "Old Boot": Item(
        name="Old Boot", type=ItemType.MISC, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Someone's discarded footwear.", effects=[], value=1
    ),
    "Twig": Item(
        name="Twig", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A small dried twig.", effects=[], value=1
    ),
    "Moss": Item(
        name="Moss", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Soft green moss.", effects=[], value=1
    ),
    "Spider Web": Item(
        name="Spider Web", type=ItemType.MISC, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="Sticky spider silk.", effects=[], value=2
    ),
    "Mud": Item(
        name="Mud", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Rich, dark soil.", effects=[], value=1
    ),
    "Leaf": Item(
        name="Leaf", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A fallen autumn leaf.", effects=[], value=1
    ),
    "Nut": Item(
        name="Nut", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="A hard-shelled tree nut.", effects=[ItemEffect("heal", 1)], value=1, usable=True
    ),
    "Pine Cone": Item(
        name="Pine Cone", type=ItemType.MISC, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="A seed-bearing cone from a pine tree.", effects=[], value=1
    ),
    "Sand": Item(
        name="Sand", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Fine grains of weathered rock.", effects=[], value=1
    ),
    "Seashell": Item(
        name="Seashell", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A beautiful spiral shell.", effects=[], value=3
    ),
    "Dried Meat": Item(
        name="Dried Meat", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Preserved meat rations.", effects=[ItemEffect("heal", 4)], value=3, usable=True
    ),
    "Cheese": Item(
        name="Cheese", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Aged cheese wheel.", effects=[ItemEffect("heal", 3)], value=2, usable=True
    ),
    "Honey": Item(
        name="Honey", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="Sweet golden honey.", effects=[ItemEffect("heal", 4)], value=4, usable=True
    ),
    "Wooden Club": Item(
        name="Wooden Club", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="A heavy wooden cudgel.", effects=[ItemEffect("damage", 3)], value=4, stackable=False
    ),
    "Sling": Item(
        name="Sling", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="Simple leather sling for stones.", effects=[ItemEffect("damage", 2)], value=3, stackable=False
    ),
    "Padded Vest": Item(
        name="Padded Vest", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Cloth armor with padding.", effects=[ItemEffect("armor", 1)], value=7, stackable=False
    ),
    "Work Gloves": Item(
        name="Work Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Sturdy leather work gloves.", effects=[ItemEffect("grip", 5)], value=5, stackable=False
    ),
    "Wool Cloak": Item(
        name="Wool Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Warm woolen cloak.", effects=[ItemEffect("cold_resist", 10)], value=8, stackable=False
    ),
    "Iron Nail": Item(
        name="Iron Nail", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A sturdy iron nail.", effects=[], value=2
    ),
    "Glass Shard": Item(
        name="Glass Shard", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A sharp piece of broken glass.", effects=[], value=1
    ),
    "Chalk": Item(
        name="Chalk", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="White chalk for marking.", effects=[], value=1
    ),
    "Ink": Item(
        name="Ink", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Black writing ink.", effects=[], value=3
    ),
    "Quill": Item(
        name="Quill", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A feather pen for writing.", effects=[], value=2
    ),
    "Bucket": Item(
        name="Bucket", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.COMMON,
        description="A wooden water bucket.", effects=[], value=5
    ),
    "Horseshoe": Item(
        name="Horseshoe", type=ItemType.MISC, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="A lucky iron horseshoe.", effects=[], value=4
    ),
    "Oil": Item(
        name="Oil", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Lamp oil for burning.", effects=[], value=3
    ),
    "Wax": Item(
        name="Wax", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Natural beeswax.", effects=[], value=2
    ),
    "Coal": Item(
        name="Coal", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Black coal for fuel.", effects=[], value=3
    ),
    "Charcoal": Item(
        name="Charcoal", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Burned wood charcoal.", effects=[], value=2
    ),
    "Soap": Item(
        name="Soap", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Basic cleaning soap.", effects=[], value=2
    ),
    "Towel": Item(
        name="Towel", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A rough cloth towel.", effects=[], value=3
    ),
    "Blanket": Item(
        name="Blanket", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A warm woolen blanket.", effects=[], value=8
    ),
    "Fishing Line": Item(
        name="Fishing Line", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="Strong line for fishing.", effects=[], value=4
    ),
    "Hook": Item(
        name="Hook", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A small metal fishing hook.", effects=[], value=2
    ),
    "Net": Item(
        name="Net", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A fishing or hunting net.", effects=[], value=6
    ),
    "Hammer": Item(
        name="Hammer", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.COMMON,
        description="A basic carpenter's hammer.", effects=[ItemEffect("damage", 3), ItemEffect("stun_chance", 10)], value=8, stackable=False
    ),
    "Chisel": Item(
        name="Chisel", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A stone-cutting chisel.", effects=[], value=4
    ),
    "File": Item(
        name="File", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="A metal sharpening file.", effects=[], value=3
    ),
    "Bellows": Item(
        name="Bellows", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.COMMON,
        description="For stoking fires.", effects=[], value=7
    ),
    "Cloth Hood": Item(
        name="Cloth Hood", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Simple fabric hood for basic protection.", effects=[ItemEffect("cold_resist", 5)], value=4, stackable=False
    ),
    "Leather Cap": Item(
        name="Leather Cap", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Basic leather headwear.", effects=[ItemEffect("armor", 1)], value=6, stackable=False
    ),
    "Wool Hat": Item(
        name="Wool Hat", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Warm woolen hat.", effects=[ItemEffect("cold_resist", 10)], value=5, stackable=False
    ),
    "Iron Coif": Item(
        name="Iron Coif", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Simple iron chain mail hood.", effects=[ItemEffect("armor", 2)], value=15, stackable=False
    ),
    "Bandana": Item(
        name="Bandana", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Cloth head covering.", effects=[], value=3, stackable=False
    ),
    "Straw Hat": Item(
        name="Straw Hat", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Woven straw sun hat.", effects=[], value=4, stackable=False
    ),
    "Rusty Helm": Item(
        name="Rusty Helm", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Old corroded helmet.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Fur Cap": Item(
        name="Fur Cap", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Warm animal fur cap.", effects=[ItemEffect("cold_resist", 15)], value=7, stackable=False
    ),
    "Cotton Headwrap": Item(
        name="Cotton Headwrap", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Simple cloth head covering.", effects=[], value=3, stackable=False
    ),
    "Copper Circlet": Item(
        name="Copper Circlet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.COMMON,
        description="Tarnished copper band.", effects=[ItemEffect("mana_regen", 1)], value=12, stackable=False
    ),
    "Hide Vest": Item(
        name="Hide Vest", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Rough animal hide protection.", effects=[ItemEffect("armor", 2)], value=10, stackable=False
    ),
    "Canvas Jerkin": Item(
        name="Canvas Jerkin", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Thick canvas work shirt.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Quilted Armor": Item(
        name="Quilted Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Padded cloth protection.", effects=[ItemEffect("armor", 2)], value=12, stackable=False
    ),
    "Rough Tunic": Item(
        name="Rough Tunic", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Basic cloth shirt.", effects=[ItemEffect("armor", 1)], value=5, stackable=False
    ),
    "Studded Leather": Item(
        name="Studded Leather", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Leather reinforced with metal studs.", effects=[ItemEffect("armor", 3)], value=18, stackable=False
    ),
    "Boiled Leather": Item(
        name="Boiled Leather", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Hardened leather chest piece.", effects=[ItemEffect("armor", 3)], value=16, stackable=False
    ),
    "Wool Robes": Item(
        name="Wool Robes", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Warm woolen garments.", effects=[ItemEffect("cold_resist", 10)], value=14, stackable=False
    ),
    "Linen Shirt": Item(
        name="Linen Shirt", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Fine linen clothing.", effects=[ItemEffect("dodge", 2)], value=9, stackable=False
    ),
    "Ring Mail": Item(
        name="Ring Mail", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Interlocked metal rings.", effects=[ItemEffect("armor", 4)], value=25, stackable=False
    ),
    "Fur Coat": Item(
        name="Fur Coat", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.COMMON,
        description="Thick animal fur garment.", effects=[ItemEffect("cold_resist", 20)], value=20, stackable=False
    ),
    "Cloth Pants": Item(
        name="Cloth Pants", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Simple fabric trousers.", effects=[ItemEffect("armor", 1)], value=6, stackable=False
    ),
    "Leather Trousers": Item(
        name="Leather Trousers", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Basic leather leg protection.", effects=[ItemEffect("armor", 1)], value=10, stackable=False
    ),
    "Hemp Breeches": Item(
        name="Hemp Breeches", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Rough hemp fiber pants.", effects=[ItemEffect("armor", 2)], value=7, stackable=False
    ),
    "Wool Leggings": Item(
        name="Wool Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Warm woolen leg coverings.", effects=[ItemEffect("cold_resist", 10)], value=8, stackable=False
    ),
    "Padded Greaves": Item(
        name="Padded Greaves", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Quilted leg armor.", effects=[ItemEffect("armor", 2)], value=12, stackable=False
    ),
    "Canvas Pants": Item(
        name="Canvas Pants", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Sturdy canvas work pants.", effects=[ItemEffect("armor", 2)], value=9, stackable=False
    ),
    "Hide Chaps": Item(
        name="Hide Chaps", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Animal hide leg guards.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Linen Trousers": Item(
        name="Linen Trousers", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Fine linen leg wear.", effects=[ItemEffect("dodge", 2)], value=11, stackable=False
    ),
    "Rough Leggings": Item(
        name="Rough Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Coarse fabric leg protection.", effects=[ItemEffect("armor", 3)], value=5, stackable=False
    ),
    "Studded Chaps": Item(
        name="Studded Chaps", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.COMMON,
        description="Leather chaps with metal studs.", effects=[ItemEffect("armor", 2)], value=14, stackable=False
    ),
    "Cloth Shoes": Item(
        name="Cloth Shoes", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Simple fabric footwear.", effects=[ItemEffect("dodge", 2)], value=4, stackable=False
    ),
    "Wooden Clogs": Item(
        name="Wooden Clogs", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Carved wooden shoes.", effects=[ItemEffect("cold_resist", 10)], value=6, stackable=False
    ),
    "Hide Moccasins": Item(
        name="Hide Moccasins", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Soft leather foot coverings.", effects=[ItemEffect("stealth_bonus", 5)], value=8, stackable=False
    ),
    "Canvas Boots": Item(
        name="Canvas Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Sturdy canvas work boots.", effects=[ItemEffect("armor", 5)], value=9, stackable=False
    ),
    "Rope Sandals": Item(
        name="Rope Sandals", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Woven rope foot protection.", effects=[], value=5, stackable=False
    ),
    "Felt Slippers": Item(
        name="Felt Slippers", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Soft felt indoor shoes.", effects=[ItemEffect("cold_resist", 5)], value=7, stackable=False
    ),
    "Iron Clogs": Item(
        name="Iron Clogs", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Heavy metal shoes.", effects=[ItemEffect("armor", 2), ItemEffect("kick_damage", 2)], value=15, stackable=False
    ),
    "Straw Shoes": Item(
        name="Straw Shoes", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Woven straw footwear.", effects=[ItemEffect("cold_resist", 5)], value=3, stackable=False
    ),
    "Fur Boots": Item(
        name="Fur Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Warm fur-lined boots.", effects=[ItemEffect("cold_resist", 15)], value=12, stackable=False
    ),
    "Cork Sandals": Item(
        name="Cork Sandals", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.COMMON,
        description="Light cork sole sandals.", effects=[ItemEffect("dodge", 2)], value=8, stackable=False
    ),
    "Cloth Mittens": Item(
        name="Cloth Mittens", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Simple fabric hand coverings.", effects=[ItemEffect("cold_resist", 5)], value=4, stackable=False
    ),
    "Leather Gloves": Item(
        name="Leather Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Basic leather hand protection.", effects=[ItemEffect("grip", 5)], value=6, stackable=False
    ),
    "Wool Mittens": Item(
        name="Wool Mittens", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Warm woolen mittens.", effects=[ItemEffect("cold_resist", 10)], value=5, stackable=False
    ),
    "Canvas Gloves": Item(
        name="Canvas Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Sturdy canvas work gloves.", effects=[ItemEffect("armor", 2)], value=7, stackable=False
    ),
    "Padded Gloves": Item(
        name="Padded Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Quilted hand protection.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Hemp Wraps": Item(
        name="Hemp Wraps", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Rough hemp hand wrappings.", effects=[ItemEffect("grip", 3)], value=3, stackable=False
    ),
    "Fur Gloves": Item(
        name="Fur Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Warm fur-lined gloves.", effects=[ItemEffect("cold_resist", 15)], value=9, stackable=False
    ),
    "Cotton Gloves": Item(
        name="Cotton Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Soft cotton hand coverings.", effects=[ItemEffect("grip", 2)], value=5, stackable=False
    ),
    "Hide Bracers": Item(
        name="Hide Bracers", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Animal hide wrist guards.", effects=[ItemEffect("armor", 1)], value=6, stackable=False
    ),
    "Linen Wraps": Item(
        name="Linen Wraps", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.COMMON,
        description="Fine linen hand bindings.", effects=[ItemEffect("armor", 1)], value=4, stackable=False
    ),
    "Rough Cloak": Item(
        name="Rough Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Coarse fabric cloak.", effects=[ItemEffect("cold_resist", 5)], value=8, stackable=False
    ),
    "Hide Cloak": Item(
        name="Hide Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Animal hide shoulder covering.", effects=[ItemEffect("armor", 1)], value=10, stackable=False
    ),
    "Canvas Cape": Item(
        name="Canvas Cape", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Sturdy canvas traveling cloak.", effects=[ItemEffect("armor", 5)], value=12, stackable=False
    ),
    "Linen Cape": Item(
        name="Linen Cape", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Light linen shoulder wrap.", effects=[ItemEffect("dodge", 2)], value=9, stackable=False
    ),
    "Cotton Shawl": Item(
        name="Cotton Shawl", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Soft cotton shoulder covering.", effects=[ItemEffect("cold_resist", 10)], value=7, stackable=False
    ),
    "Hemp Cloak": Item(
        name="Hemp Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Rough hemp fiber cloak.", effects=[ItemEffect("armor", 8)], value=6, stackable=False
    ),
    "Fur Mantle": Item(
        name="Fur Mantle", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Warm fur shoulder covering.", effects=[ItemEffect("cold_resist", 20)], value=15, stackable=False
    ),
    "Cloth Cape": Item(
        name="Cloth Cape", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Simple fabric cape.", effects=[ItemEffect("cold_resist", 5)], value=5, stackable=False
    ),
    "Tattered Cloak": Item(
        name="Tattered Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Worn and torn traveling cloak.", effects=[ItemEffect("stealth_bonus", 3)], value=3, stackable=False
    ),
    "Oiled Cape": Item(
        name="Oiled Cape", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.COMMON,
        description="Water-resistant treated fabric.", effects=[ItemEffect("cold_resist", 15)], value=11, stackable=False
    ),
    "Small Shield": Item(
        name="Small Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Basic round wooden shield.", effects=[ItemEffect("armor", 2)], value=12, stackable=False
    ),
    "Leather Buckler": Item(
        name="Leather Buckler", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Small leather-bound shield.", effects=[ItemEffect("block_chance", 10)], value=10, stackable=False
    ),
    "Wicker Shield": Item(
        name="Wicker Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Woven basket-like shield.", effects=[ItemEffect("armor", 1)], value=6, stackable=False
    ),
    "Copper Buckler": Item(
        name="Copper Buckler", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Tarnished copper small shield.", effects=[ItemEffect("armor", 2), ItemEffect("block_chance", 5)], value=15, stackable=False
    ),
    "Hide Shield": Item(
        name="Hide Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Animal hide stretched over frame.", effects=[ItemEffect("armor", 1)], value=8, stackable=False
    ),
    "Canvas Targe": Item(
        name="Canvas Targe", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Canvas-covered round shield.", effects=[ItemEffect("block_chance", 8)], value=9, stackable=False
    ),
    "Bark Shield": Item(
        name="Bark Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Tree bark fashioned into shield.", effects=[ItemEffect("armor", 1)], value=5, stackable=False
    ),
    "Reed Shield": Item(
        name="Reed Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Woven reed defensive item.", effects=[ItemEffect("cold_resist", 10)], value=4, stackable=False
    ),
    "Stone Disc": Item(
        name="Stone Disc", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Carved stone defensive disc.", effects=[ItemEffect("armor", 2)], value=7, stackable=False
    ),
    "Pot Lid": Item(
        name="Pot Lid", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.COMMON,
        description="Repurposed cooking pot lid.", effects=[ItemEffect("block_chance", 5)], value=3, stackable=False
    ),
    "Bone Charm": Item(
        name="Bone Charm", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Simple carved bone pendant.", effects=[ItemEffect("dodge", 1)], value=8, stackable=False
    ),
    "Wood Pendant": Item(
        name="Wood Pendant", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Carved wooden necklace charm.", effects=[ItemEffect("heal", 3)], value=6, stackable=False
    ),
    "Stone Amulet": Item(
        name="Stone Amulet", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Polished stone on cord.", effects=[ItemEffect("armor", 3)], value=7, stackable=False
    ),
    "Clay Charm": Item(
        name="Clay Charm", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Simple fired clay pendant.", effects=[ItemEffect("armor", 3)], value=4, stackable=False
    ),
    "Shell Necklace": Item(
        name="Shell Necklace", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Sea shells strung together.", effects=[ItemEffect("cold_resist", 5)], value=9, stackable=False
    ),
    "Feather Charm": Item(
        name="Feather Charm", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Bird feathers bound with twine.", effects=[ItemEffect("dodge", 3)], value=5, stackable=False
    ),
    "Copper Chain": Item(
        name="Copper Chain", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Tarnished copper neck chain.", effects=[ItemEffect("lightning_damage", 5)], value=12, stackable=False
    ),
    "Leather Cord": Item(
        name="Leather Cord", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Simple leather neck cord.", effects=[ItemEffect("heal", 2)], value=3, stackable=False
    ),
    "Glass Bead": Item(
        name="Glass Bead", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Small glass bead on string.", effects=[ItemEffect("night_vision", 2)], value=8, stackable=False
    ),
    "Herb Pouch": Item(
        name="Herb Pouch", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.COMMON,
        description="Small pouch of dried herbs.", effects=[ItemEffect("heal", 2)], value=10, stackable=False
    ),
    "Copper Ring": Item(
        name="Copper Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Simple tarnished copper band.", effects=[ItemEffect("lightning_damage", 3)], value=5, stackable=False
    ),
    "Bone Ring": Item(
        name="Bone Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Carved animal bone ring.", effects=[ItemEffect("armor", 2)], value=4, stackable=False
    ),
    "Wood Ring": Item(
        name="Wood Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Carved hardwood finger ring.", effects=[ItemEffect("heal", 2)], value=3, stackable=False
    ),
    "Stone Ring": Item(
        name="Stone Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Polished stone band.", effects=[ItemEffect("armor", 2)], value=6, stackable=False
    ),
    "Clay Band": Item(
        name="Clay Band", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Fired clay finger ring.", effects=[ItemEffect("armor", 2)], value=2, stackable=False
    ),
    "Iron Ring": Item(
        name="Iron Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Simple iron band.", effects=[ItemEffect("damage", 1)], value=8, stackable=False
    ),
    "Brass Ring": Item(
        name="Brass Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Tarnished brass finger ring.", effects=[ItemEffect("all_resist", 2)], value=7, stackable=False
    ),
    "Shell Ring": Item(
        name="Shell Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Carved sea shell band.", effects=[ItemEffect("cold_resist", 3)], value=5, stackable=False
    ),
    "Leather Ring": Item(
        name="Leather Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Braided leather finger band.", effects=[ItemEffect("heal", 1)], value=3, stackable=False
    ),
    "Hemp Ring": Item(
        name="Hemp Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.COMMON,
        description="Woven hemp fiber ring.", effects=[ItemEffect("armor", 1)], value=2, stackable=False
    ),
    "Rope Belt": Item(
        name="Rope Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Simple rope waist tie.", effects=[ItemEffect("armor", 3)], value=4, stackable=False
    ),
    "Leather Belt": Item(
        name="Leather Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Basic leather waist belt.", effects=[ItemEffect("heal", 5)], value=8, stackable=False
    ),
    "Canvas Sash": Item(
        name="Canvas Sash", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Sturdy canvas waist wrap.", effects=[ItemEffect("armor", 5)], value=6, stackable=False
    ),
    "Cloth Belt": Item(
        name="Cloth Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Simple fabric waist tie.", effects=[ItemEffect("heal", 3)], value=3, stackable=False
    ),
    "Hemp Cord": Item(
        name="Hemp Cord", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Rough hemp fiber belt.", effects=[ItemEffect("armor", 8)], value=5, stackable=False
    ),
    "Vine Belt": Item(
        name="Vine Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Woven plant vine waist tie.", effects=[ItemEffect("heal", 3)], value=4, stackable=False
    ),
    "Copper Chain Belt": Item(
        name="Copper Chain Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Tarnished copper link belt.", effects=[ItemEffect("lightning_damage", 5)], value=12, stackable=False
    ),
    "Braided Sash": Item(
        name="Braided Sash", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Interwoven fabric waist sash.", effects=[ItemEffect("dodge", 5)], value=7, stackable=False
    ),
    "Hide Belt": Item(
        name="Hide Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Animal hide waist strap.", effects=[ItemEffect("armor", 1)], value=9, stackable=False
    ),
    "Cloth Sash": Item(
        name="Cloth Sash", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.COMMON,
        description="Long cloth waist wrap.", effects=[ItemEffect("heal", 8)], value=6, stackable=False
    ),
    "Lucky Coin": Item(
        name="Lucky Coin", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A worn copper coin for luck.", effects=[ItemEffect("dodge", 2)], value=5, stackable=False
    ),
    "Rabbit Foot": Item(
        name="Rabbit Foot", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="A small creature's foot for luck.", effects=[ItemEffect("dodge", 1), ItemEffect("dodge", 1)], value=6, stackable=False
    ),
    "Prayer Beads": Item(
        name="Prayer Beads", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="String of carved wooden beads.", effects=[ItemEffect("heal", 5)], value=8, stackable=False
    ),
    "Worry Stone": Item(
        name="Worry Stone", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Smooth stone worn by handling.", effects=[ItemEffect("heal", 3)], value=4, stackable=False
    ),
    "Dice Set": Item(
        name="Dice Set", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Bone dice for games of chance.", effects=[ItemEffect("dodge", 3)], value=7, stackable=False
    ),
    "Compass": Item(
        name="Compass", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Simple direction-finding device.", effects=[ItemEffect("night_vision", 10)], value=15, stackable=False
    ),
    "Spyglass": Item(
        name="Spyglass", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Small telescope for distance viewing.", effects=[ItemEffect("night_vision", 5)], value=20, stackable=False
    ),
    "Flute": Item(
        name="Flute", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Simple wooden wind instrument.", effects=[ItemEffect("heal", 5)], value=12, stackable=False
    ),
    "Whistle": Item(
        name="Whistle", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Carved bone signal whistle.", effects=[], value=6, stackable=False
    ),
    "Journal": Item(
        name="Journal", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Leather-bound blank book.", effects=[], value=10, stackable=False
    ),
    "Magnifying Glass": Item(
        name="Magnifying Glass", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Glass lens for examining details.", effects=[ItemEffect("night_vision", 8)], value=18, stackable=False
    ),
    "Hourglass": Item(
        name="Hourglass", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Sand-filled time keeping device.", effects=[], value=12, stackable=False
    ),
    "Map Fragment": Item(
        name="Map Fragment", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Torn piece of an old map.", effects=[ItemEffect("night_vision", 3)], value=8, stackable=False
    ),
    "Fishing Hook": Item(
        name="Fishing Hook", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Curved metal hook for fishing.", effects=[], value=4, stackable=False
    ),
    "Measuring Cord": Item(
        name="Measuring Cord", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Knotted cord for measuring distance.", effects=[], value=6, stackable=False
    ),
    "Tinder Box": Item(
        name="Tinder Box", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Fire starting materials.", effects=[ItemEffect("fire_damage", 10)], value=8, stackable=False
    ),
    "Small Mirror": Item(
        name="Small Mirror", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Polished metal reflection surface.", effects=[], value=12, stackable=False
    ),
    "Sewing Kit": Item(
        name="Sewing Kit", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Needle, thread, and small scissors.", effects=[ItemEffect("heal", 8)], value=10, stackable=False
    ),
    "Perfume Vial": Item(
        name="Perfume Vial", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Small bottle of pleasant scent.", effects=[ItemEffect("dodge", 3)], value=15, stackable=False
    ),
    "Salt Pouch": Item(
        name="Salt Pouch", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Small bag of precious salt.", effects=[], value=12, stackable=False
    ),
    "Dried Flowers": Item(
        name="Dried Flowers", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Pressed flowers for remembrance.", effects=[], value=6, stackable=False
    ),
    "Bird Feather": Item(
        name="Bird Feather", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Colorful plume from exotic bird.", effects=[], value=4, stackable=False
    ),
    "Smooth Pebbles": Item(
        name="Smooth Pebbles", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Collection of river-worn stones.", effects=[ItemEffect("heal", 2)], value=3, stackable=False
    ),
    "Clay Tablet": Item(
        name="Clay Tablet", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Fired clay with markings.", effects=[], value=7, stackable=False
    ),
    "Carved Stick": Item(
        name="Carved Stick", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.COMMON,
        description="Wooden rod with intricate patterns.", effects=[], value=5, stackable=False
    ),
    "Ancient Coin": Item(
        name="Ancient Coin", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Old currency from forgotten empire.", effects=[], value=25, stackable=False
    ),
    "Broken Statue": Item(
        name="Broken Statue", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Fragment of ancient sculpture.", effects=[], value=20, stackable=False
    ),
    "Old Scroll": Item(
        name="Old Scroll", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Faded parchment with illegible text.", effects=[], value=15, stackable=False
    ),
    "Rusted Blade": Item(
        name="Rusted Blade", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Corroded weapon from ancient battle.", effects=[], value=18, stackable=False
    ),
    "Stone Tablet": Item(
        name="Stone Tablet", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Weathered stone with carved symbols.", effects=[], value=22, stackable=False
    ),
    "Pottery Shard": Item(
        name="Pottery Shard", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Piece of decorated ceramic vessel.", effects=[], value=12, stackable=False
    ),
    "Bone Carving": Item(
        name="Bone Carving", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Etched bone with primitive art.", effects=[], value=16, stackable=False
    ),
    "Worn Amulet": Item(
        name="Worn Amulet", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Faded charm of unknown purpose.", effects=[], value=14, stackable=False
    ),
    "Ancient Tool": Item(
        name="Ancient Tool", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Primitive implement of forgotten use.", effects=[], value=19, stackable=False
    ),
    "Faded Banner": Item(
        name="Faded Banner", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Tattered cloth with unreadable heraldry.", effects=[], value=13, stackable=False
    ),
    "Old Lock": Item(
        name="Old Lock", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Mechanism without its key.", effects=[], value=17, stackable=False
    ),
    "Cracked Gem": Item(
        name="Cracked Gem", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.COMMON,
        description="Flawed precious stone of ancient origin.", effects=[], value=30, stackable=False
    ),

# ====================== #
# === UNCOMMON Items === #
# ====================== #
    
    "Iron Sword": Item(
        name="Iron Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="A sturdy iron blade, sharper than training weapons.", effects=[ItemEffect("damage", 4)], value=15, stackable=False
    ),
    "Hunter’s Bow": Item(
        name="Hunter’s Bow", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="A bow favored by hunters. Light and reliable.", effects=[ItemEffect("damage", 3), ItemEffect("crit_chance", 5)], value=20, stackable=False
    ),
    "Iron Shield": Item(
        name="Iron Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.UNCOMMON,
        description="A solid iron shield offering good protection.", effects=[ItemEffect("armor", 3)], value=18, stackable=False
    ),
    "Traveler’s Boots": Item(
        name="Traveler’s Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.UNCOMMON,
        description="Sturdy boots that make long journeys easier.", effects=[ItemEffect("dodge", 10)], value=16, stackable=False
    ),
    "Amulet of Focus": Item(
        name="Amulet of Focus", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.UNCOMMON,
        description="A simple amulet that aids concentration.", effects=[ItemEffect("mana_regen", 1)], value=22, stackable=False
    ),
    "Reinforced Leather Armor": Item(
        name="Reinforced Leather Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.UNCOMMON,
        description="Leather armor reinforced with studs and plates.", effects=[ItemEffect("armor", 2)], value=25, stackable=False
    ),
    "Steel Dagger": Item(
        name="Steel Dagger", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="Sharper than a rusty knife, ideal for quick strikes.", effects=[ItemEffect("damage", 3), ItemEffect("bleed", 1, 2)], value=20, stackable=False
    ),
    "Shortsword": Item(
    name="Shortsword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
    description="Balanced one-handed blade.", effects=[ItemEffect("damage", 5)], value=22, stackable=False
    ),
    "Spiked Club": Item(
        name="Spiked Club", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="A brutal club with crude spikes.", effects=[ItemEffect("damage", 4), ItemEffect("bleed", 1, 2)], value=18, stackable=False
    ),
    "Mace": Item(
        name="Mace", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="Blunt weapon that crushes armor.", effects=[ItemEffect("damage", 5), ItemEffect("armor_pierce", 1)], value=24, stackable=False
    ),
    "Spear": Item(
        name="Spear", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="Reach weapon favored by militia.", effects=[ItemEffect("damage", 4), ItemEffect("pierce", 1)], value=20, stackable=False
    ),
    "Oak Staff": Item(
        name="Oak Staff", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="Sturdy staff channeling minor magic.", effects=[ItemEffect("damage", 3), ItemEffect("spell_power", 6)], value=26, stackable=False
    ),
    "Crossbow": Item(
        name="Crossbow", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.UNCOMMON,
        description="Compact ranged weapon with a snap.", effects=[ItemEffect("damage", 5), ItemEffect("crit_chance", 3)], value=28, stackable=False
    ),
    "Bronze Helm": Item(
        name="Bronze Helm", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.UNCOMMON,
        description="Sturdy bronze headgear.", effects=[ItemEffect("armor", 2)], value=18, stackable=False
    ),
    "Scout Hood": Item(
        name="Scout Hood", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.UNCOMMON,
        description="Hood for keen-eyed wanderers.", effects=[ItemEffect("dodge", 4), ItemEffect("stealth_bonus", 5)], value=20, stackable=False
    ),
    "Brigandine": Item(
        name="Brigandine", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.UNCOMMON,
        description="Layered plates riveted to cloth.", effects=[ItemEffect("armor", 3)], value=28, stackable=False
    ),
    "Hunter Vest": Item(
        name="Hunter Vest", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.UNCOMMON,
        description="Light armor for agile hunters.", effects=[ItemEffect("armor", 2), ItemEffect("dodge", 4)], value=26, stackable=False
    ),
    "Leather Greaves": Item(
        name="Leather Greaves", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.UNCOMMON,
        description="Reinforced leg protection.", effects=[ItemEffect("armor", 2)], value=16, stackable=False
    ),
    "Pathfinder Trousers": Item(
        name="Pathfinder Trousers", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.UNCOMMON,
        description="Cut for swift movement.", effects=[ItemEffect("dodge", 4)], value=18, stackable=False
    ),
    "Studded Boots": Item(
        name="Studded Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.UNCOMMON,
        description="Grippy soles with metal studs.", effects=[ItemEffect("dodge", 6)], value=19, stackable=False
    ),
    "Traveler Greaves": Item(
        name="Traveler Greaves", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.UNCOMMON,
        description="Built for long marches.", effects=[ItemEffect("armor", 2), ItemEffect("kick_damage", 2)], value=20, stackable=False
    ),
    "Iron Gauntlets+": Item(
        name="Iron Gauntlets+", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.UNCOMMON,
        description="Heavier hand protection.", effects=[ItemEffect("armor", 2), ItemEffect("punch_damage", 2)], value=18, stackable=False
    ),
    "Archer Gloves": Item(
        name="Archer Gloves", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.UNCOMMON,
        description="Finger tabs and padded knuckles.", effects=[ItemEffect("crit_chance", 3), ItemEffect("grip", 5)], value=17, stackable=False
    ),
    "Wolf Pelt Cloak": Item(
        name="Wolf Pelt Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.UNCOMMON,
        description="Warm pelt with a hunter’s scent.", effects=[ItemEffect("cold_resist", 20), ItemEffect("stealth_bonus", 5)], value=22, stackable=False
    ),
    "Woodland Cloak": Item(
        name="Woodland Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.UNCOMMON,
        description="Camouflaged cloak of forest hunters.", effects=[ItemEffect("stealth_bonus", 5), ItemEffect("dodge", 5)], value=20, stackable=False
    ),
    "Kite Shield": Item(
        name="Kite Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.UNCOMMON,
        description="Tall shield for full coverage.", effects=[ItemEffect("armor", 3), ItemEffect("block_chance", 10)], value=24, stackable=False
    ),
    "Mirror Buckler": Item(
        name="Mirror Buckler", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.UNCOMMON,
        description="Polished face that dazzles.", effects=[ItemEffect("armor", 2), ItemEffect("reflect", 10)], value=26, stackable=False
    ),
    "Buckled Belt": Item(
        name="Buckled Belt", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.UNCOMMON,
        description="Keeps gear tight in a fight.", effects=[ItemEffect("damage", 1), ItemEffect("grip", 3)], value=16, stackable=False
    ),
    "Emerald Ring": Item(
        name="Emerald Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.UNCOMMON,
        description="Polished green gem ring.", effects=[ItemEffect("mana_regen", 1), ItemEffect("spell_power", 3)], value=28, stackable=False
    ),
    "Ruby Ring": Item(
        name="Ruby Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.UNCOMMON,
        description="Glints with inner fire.", effects=[ItemEffect("damage", 2)], value=28, stackable=False
    ),
    "Topaz Ring": Item(
        name="Topaz Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.UNCOMMON,
        description="Holds a spark of luck.", effects=[ItemEffect("crit_chance", 5)], value=30, stackable=False
    ),
    "Amulet of Warding": Item(
        name="Amulet of Warding", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.UNCOMMON,
        description="Protective sigils etched within.", effects=[ItemEffect("magic_resist", 10)], value=26, stackable=False
    ),
    "Scout’s Locket": Item(
        name="Scout’s Locket", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.UNCOMMON,
        description="Lightweight charm for travelers.", effects=[ItemEffect("dodge", 8)], value=24, stackable=False
    ),
    "Lucky Charm": Item(
        name="Lucky Charm", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.UNCOMMON,
        description="A coin with a hole—often rubbed.", effects=[ItemEffect("crit_chance", 3)], value=18
    ),
    "Night-Scout Lens": Item(
        name="Night-Scout Lens", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.UNCOMMON,
        description="Polished glass that gathers starlight.", effects=[ItemEffect("night_vision", 1), ItemEffect("stealth_bonus", 5)], value=22
    ),
    "Minor Mana Potion": Item(
        name="Minor Mana Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.UNCOMMON,
        description="Restores a little magical energy.", effects=[ItemEffect("mana", 8)], value=10, usable=True
    ),
    "Tonic of Vigor": Item(
        name="Tonic of Vigor", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.UNCOMMON,
        description="Brief surge of strength.", effects=[ItemEffect("damage_buff", 2, 4)], value=14, usable=True
    ),
    "Smoke Vial": Item(
        name="Smoke Vial", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.UNCOMMON,
        description="Conceals movement for a moment.", effects=[ItemEffect("stealth", 2)], value=12, usable=True
    ),

# ====================== #
# ===== RARE Items ===== #
# ====================== #

    "Greater Potion": Item(
        name="Greater Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="A powerful healing potion.", effects=[ItemEffect("heal", 10)], value=15, usable=True
    ),
    "Enchanted Dagger": Item(
        name="Enchanted Dagger", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="A magical dagger that causes bleeding.", 
        effects=[ItemEffect("damage", 5), ItemEffect("bleed", 2, 3)], value=25, stackable=False
    ),
    "Elixir of Strength": Item(
        name="Elixir of Strength", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Increases damage for several rounds.", 
        effects=[ItemEffect("damage_buff", 3, 5)], value=20, usable=True
    ),
    "Mana Potion": Item(
        name="Mana Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Restores magical energy.", effects=[ItemEffect("mana", 15)], value=18, usable=True
    ),
    "Silver Sword": Item(
        name="Silver Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="A finely crafted silver blade.", effects=[ItemEffect("damage", 8)], value=45, stackable=False
    ),
    "Leather Armor": Item(
        name="Leather Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Flexible leather protection.", effects=[ItemEffect("armor", 4)], value=35, stackable=False
    ),
    "Magic Scroll": Item(
        name="Magic Scroll", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Contains a powerful spell.", effects=[ItemEffect("damage", 12)], value=25, usable=True
    ),
    "Antidote": Item(
        name="Antidote", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Cures poison and heals significantly.", 
        effects=[ItemEffect("heal", 8), ItemEffect("cure_poison", 1)], value=22, usable=True
    ),
    "Warmage Ring": Item(
        name="Warmage Ring", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="A ring that enhances magical abilities.", 
        effects=[ItemEffect("mana_regen", 2), ItemEffect("damage", 2)], value=50, stackable=False
    ),
    "Sturdy Buckler": Item(
        name="Sturdy Buckler", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.RARE,
        description="A small but effective shield.", 
        effects=[ItemEffect("armor", 5), ItemEffect("block_chance", 15)], value=40, stackable=False
    ),
    "Mystic Gem": Item(
        name="Mystic Gem", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.RARE,
        description="A gem that pulses with magical energy.", effects=[], value=60
    ),
    "Lockpick Set": Item(
        name="Lockpick Set", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.RARE,
        description="Tools for opening locked containers.", effects=[], value=30
    ),
    "Crystal Vial": Item(
        name="Crystal Vial", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="A perfect crystal container.", effects=[], value=25
    ),
    "Blessed Water": Item(
        name="Blessed Water", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Holy water that removes curses.", 
        effects=[ItemEffect("heal", 6), ItemEffect("remove_curse", 1)], value=30, usable=True
    ),
    "Steel Sword": Item(
        name="Steel Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="A well-forged steel blade.", effects=[ItemEffect("damage", 10)], value=60, stackable=False
    ),
    "Chain Mail": Item(
        name="Chain Mail", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Interlocked metal rings provide protection.", effects=[ItemEffect("armor", 6)], value=80, stackable=False
    ),
    "Wand of Fire": Item(
        name="Wand of Fire", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Channels fire magic.", 
        effects=[ItemEffect("damage", 6), ItemEffect("fire_damage", 4)], value=70, stackable=False
    ),
    "Boots of Speed": Item(
        name="Boots of Speed", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Increases movement and dodge chance.", effects=[ItemEffect("dodge", 20)], value=55, stackable=False
    ),
    "Healing Amulet": Item(
        name="Healing Amulet", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.RARE,
        description="Slowly regenerates health.", effects=[ItemEffect("regen", 2)], value=65, stackable=False
    ),
    "Frost Potion": Item(
        name="Frost Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Deals ice damage to enemies.", effects=[ItemEffect("ice_damage", 15)], value=28, usable=True
    ),
    "Battle Axe": Item(
        name="Battle Axe", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Heavy two-handed axe.", effects=[ItemEffect("damage", 12), ItemEffect("armor_pierce", 3)], value=65, stackable=False
    ),
    "Mage Robes": Item(
        name="Mage Robes", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Robes that enhance magical power.", effects=[ItemEffect("mana_regen", 3), ItemEffect("spell_power", 15)], value=70, stackable=False
    ),
    "Poison Dagger": Item(
        name="Poison Dagger", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Blade coated with deadly toxins.", effects=[ItemEffect("damage", 6), ItemEffect("poison", 3, 5)], value=55, stackable=False
    ),
    "Shield of Reflection": Item(
        name="Shield of Reflection", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.RARE,
        description="Reflects magical attacks back at enemies.", effects=[ItemEffect("armor", 4), ItemEffect("reflect", 25)], value=85, stackable=False
    ),
    "Invisibility Potion": Item(
        name="Invisibility Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Grants temporary invisibility.", effects=[ItemEffect("stealth", 3)], value=45, usable=True
    ),
    "Thunder Hammer": Item(
        name="Thunder Hammer", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Hammer that calls down lightning.", effects=[ItemEffect("damage", 9), ItemEffect("lightning", 6)], value=75, stackable=False
    ),
    "Cloak of Shadows": Item(
        name="Cloak of Shadows", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.RARE,
        description="Makes the wearer harder to hit.", effects=[ItemEffect("dodge", 25), ItemEffect("stealth_bonus", 10)], value=60, stackable=False
    ),
    "Berserker Potion": Item(
        name="Berserker Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Increases attack but reduces defense.", effects=[ItemEffect("damage_buff", 8, 6), ItemEffect("armor_debuff", 2, 6)], value=35, usable=True
    ),
    "Crystal Bow": Item(
        name="Crystal Bow", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Bow made of pure crystal.", effects=[ItemEffect("damage", 8), ItemEffect("pierce", 1)], value=80, stackable=False
    ),
    "Ring of Protection": Item(
        name="Ring of Protection", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="Provides magical protection.", effects=[ItemEffect("armor", 3), ItemEffect("magic_resist", 20)], value=55, stackable=False
    ),
    "Scroll of Fireball": Item(
        name="Scroll of Fireball", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Unleashes a devastating fireball.", effects=[ItemEffect("fire_damage", 20)], value=40, usable=True
    ),
    "Golden Chalice": Item(
        name="Golden Chalice", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.RARE,
        description="A valuable ceremonial cup.", effects=[], value=90
    ),
    "Vampire Fang": Item(
        name="Vampire Fang", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Drains life from enemies.", effects=[ItemEffect("damage", 7), ItemEffect("life_steal", 3)], value=65, stackable=False
    ),
    "Iron Boots": Item(
        name="Iron Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Heavy iron footwear.", effects=[ItemEffect("armor", 3), ItemEffect("kick_damage", 5)], value=45, stackable=False
    ),
    "Elixir of Speed": Item(
        name="Elixir of Speed", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Increases attack speed temporarily.", effects=[ItemEffect("speed_buff", 2, 8)], value=38, usable=True
    ),
    "Crystal Shield": Item(
        name="Crystal Shield", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.RARE,
        description="Translucent shield of pure energy.", effects=[ItemEffect("armor", 5), ItemEffect("energy_absorb", 15)], value=95, stackable=False
    ),
    "Summoning Stone": Item(
        name="Summoning Stone", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Summons a spirit ally for combat.", effects=[ItemEffect("summon_ally", 1)], value=80, usable=True
    ),
    "Moonstone Pendant": Item(
        name="Moonstone Pendant", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.RARE,
        description="Glows with lunar energy.", effects=[ItemEffect("mana_regen", 4), ItemEffect("night_vision", 1)], value=75, stackable=False
    ),
    "Scroll of Healing": Item(
        name="Scroll of Healing", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Powerful healing magic.", effects=[ItemEffect("heal", 15), ItemEffect("cure_all", 1)], value=50, usable=True
    ),
    "War Paint": Item(
        name="War Paint", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Intimidating face paint.", effects=[ItemEffect("intimidate", 20), ItemEffect("damage_buff", 2, 10)], value=25, usable=True
    ),
    "Silver Arrow": Item(
        name="Silver Arrow", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Blessed arrow effective against undead.", effects=[ItemEffect("damage", 15), ItemEffect("undead_damage", 25)], value=35, usable=True
    ),
    "Smoke Bomb": Item(
        name="Smoke Bomb", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.RARE,
        description="Creates concealing smoke.", effects=[ItemEffect("escape_chance", 50)], value=30, usable=True
    ),
    "Iron Gauntlets": Item(
        name="Iron Gauntlets", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.RARE,
        description="Heavy iron hand protection.", effects=[ItemEffect("armor", 2), ItemEffect("punch_damage", 4)], value=50, stackable=False
    ),
    "Magic Mirror": Item(
        name="Magic Mirror", type=ItemType.MISC, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.RARE,
        description="Shows glimpses of the future.", effects=[], value=120
    ),
        "Crown of Leadership": Item(
        name="Crown of Leadership", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Golden circlet that commands respect.", effects=[ItemEffect("leadership", 10)], value=150, stackable=False
    ),
    "Steel Helmet": Item(
        name="Steel Helmet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Reinforced metal head protection.", effects=[ItemEffect("armor", 6) ], value=120, stackable=False
    ),
    "Mage's Circlet": Item(
        name="Mage's Circlet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Enchanted band that enhances magical focus.", effects=[ItemEffect("mana_regen", 3), ItemEffect("spell_power", 8)], value=180, stackable=False
    ),
    "Hood of Shadows": Item(
        name="Hood of Shadows", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Dark fabric that bends light around wearer.", effects=[ItemEffect("stealth_bonus", 15), ItemEffect("dodge", 10)], value=160, stackable=False
    ),
    "Barbarian Helm": Item(
        name="Barbarian Helm", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Horned helmet that intimidates enemies.", effects=[ItemEffect("armor", 4), ItemEffect("intimidate", 20)], value=140, stackable=False
    ),
    "Silver Diadem": Item(
        name="Silver Diadem", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Elegant silver headpiece with gems.", effects=[ItemEffect("dodge", 12) ], value=200, stackable=False
    ),
    "Ranger's Cap": Item(
        name="Ranger's Cap", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Leather cap with nature's blessing.", effects=[ItemEffect("heal", 10)], value=130, stackable=False
    ),
    "Crown of Thorns": Item(
        name="Crown of Thorns", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Painful headpiece that grants resilience.", effects=[], value=110, stackable=False
    ),
    "Feathered Headdress": Item(
        name="Feathered Headdress", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Ceremonial plumes that enhance wisdom.", effects=[ItemEffect("spell_power", 10), ItemEffect("dodge", 12)], value=170, stackable=False
    ),
    "Iron Crown": Item(
        name="Iron Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Heavy metal crown of authority.", effects=[ItemEffect("armor", 5)], value=190, stackable=False
    ),
    "Crystal Helm": Item(
        name="Crystal Helm", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Translucent helmet that protects mind.", effects=[ItemEffect("armor", 3) ], value=210, stackable=False
    ),
    "Winged Helmet": Item(
        name="Winged Helmet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Helmet with decorative wing motifs.", effects=[ItemEffect("armor", 5), ItemEffect("dodge", 8)], value=175, stackable=False
    ),
    "Bone Crown": Item(
        name="Bone Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Macabre headpiece of bleached bone.", effects=[ItemEffect("intimidate", 25) ], value=135, stackable=False
    ),
    "Frost Circlet": Item(
        name="Frost Circlet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Ice-cold band that never melts.", effects=[ItemEffect("fire_resist", -10)], value=155, stackable=False
    ),
    "War Crown": Item(
        name="War Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Spiked crown worn by battle kings.", effects=[ItemEffect("armor", 4)], value=165, stackable=False
    ),
    "Sage's Hat": Item(
        name="Sage's Hat", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Wide-brimmed hat of learned scholars.", effects=[ItemEffect("spell_power", 15) ], value=145, stackable=False
    ),
    "Moon Tiara": Item(
        name="Moon Tiara", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Crescent-shaped silver headpiece.", effects=[ItemEffect("night_vision", 1)], value=185, stackable=False
    ),
    "Dragon Helm": Item(
        name="Dragon Helm", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Helmet shaped like a dragon's head.", effects=[ItemEffect("armor", 7), ItemEffect("fire_resist", 20)], value=220, stackable=False
    ),
    "Crown of Minds": Item(
        name="Crown of Minds", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.RARE,
        description="Allows limited telepathic communication.", effects=[ItemEffect("spell_power", 5) ], value=250, stackable=False
    ),
    "Blessed Chainmail": Item(
        name="Blessed Chainmail", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Holy blessed metal rings.", effects=[ItemEffect("armor", 8) ], value=200, stackable=False
    ),
    "Shadow Leather": Item(
        name="Shadow Leather", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Dark leather that absorbs light.", effects=[ItemEffect("armor", 6), ItemEffect("stealth_bonus", 15)], value=180, stackable=False
    ),
    "Crystal Plate": Item(
        name="Crystal Plate", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Crystalline chest protection.", effects=[ItemEffect("armor", 10) ], value=250, stackable=False
    ),
    "Elemental Robes": Item(
        name="Elemental Robes", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Robes infused with elemental power.", effects=[ItemEffect("spell_power", 20) ], value=220, stackable=False
    ),
    "Berserker's Hide": Item(
        name="Berserker's Hide", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Fur armor that enhances battle rage.", effects=[ItemEffect("armor", 5) ], value=170, stackable=False
    ),
    "Phoenix Feather Vest": Item(
        name="Phoenix Feather Vest", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Vest woven from phoenix plumage.", effects=[ItemEffect("armor", 7) ], value=280, stackable=False
    ),
    "Storm Cloak Armor": Item(
        name="Storm Cloak Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Armor crackling with lightning.", effects=[ItemEffect("armor", 8), ItemEffect("lightning_damage", 5)], value=210, stackable=False
    ),
    "Void Plate": Item(
        name="Void Plate", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Dark metal from the space between worlds.", effects=[ItemEffect("armor", 12), ItemEffect("void_protection", 20)], value=300, stackable=False
    ),
    "Angel's Embrace": Item(
        name="Angel's Embrace", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Radiant white robes of divine protection.", effects=[ItemEffect("heal", 12)], value=260, stackable=False
    ),
    "Nature's Guard": Item(
        name="Nature's Guard", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.RARE,
        description="Living bark that grows with the wearer.", effects=[ItemEffect("armor", 6), ItemEffect("regen", 3)], value=190, stackable=False
    ),
    "Steel Greaves": Item(
        name="Steel Greaves", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Heavy metal leg armor.", effects=[ItemEffect("armor", 6), ItemEffect("kick_damage", 8)], value=140, stackable=False
    ),
    "Shadow Leggings": Item(
        name="Shadow Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Dark fabric that muffles movement.", effects=[ItemEffect("armor", 4), ItemEffect("stealth_bonus", 12)], value=120, stackable=False
    ),
    "Pants of Swiftness": Item(
        name="Pants of Swiftness", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Enchanted legwear that enhances speed.", effects=[ItemEffect("dodge", 15), ItemEffect("dodge", 10)], value=160, stackable=False
    ),
    "Dragon Scale Leggings": Item(
        name="Dragon Scale Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Scales from an ancient wyrm.", effects=[ItemEffect("armor", 8), ItemEffect("fire_resist", 25)], value=200, stackable=False
    ),
    "Crystal Leg Guards": Item(
        name="Crystal Leg Guards", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Translucent crystal leg protection.", effects=[ItemEffect("armor", 5) ], value=180, stackable=False
    ),
    "Blessed Pants": Item(
        name="Blessed Pants", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Holy fabric woven by temple priests.", effects=[ItemEffect("armor", 3) ], value=130, stackable=False
    ),
    "Elemental Chaps": Item(
        name="Elemental Chaps", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Leather infused with elemental power.", effects=[ItemEffect("armor", 4) ], value=150, stackable=False
    ),
    "Storm Leggings": Item(
        name="Storm Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Fabric that crackles with electricity.", effects=[ItemEffect("armor", 3) ], value=145, stackable=False
    ),
    "Iron Leg Plates": Item(
        name="Iron Leg Plates", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Heavy iron leg armor pieces.", effects=[ItemEffect("armor", 7) ], value=125, stackable=False
    ),
    "Mage's Robes Lower": Item(
        name="Mage's Robes Lower", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.RARE,
        description="Lower portion of magical robes.", effects=[ItemEffect("mana_regen", 2) ], value=170, stackable=False
    ),
    "Winged Boots": Item(
        name="Winged Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Boots with small wings that grant levitation.", effects=[ItemEffect("dodge", 25), ItemEffect("flight", 1)], value=200, stackable=False
    ),
    "Frost Walker Boots": Item(
        name="Frost Walker Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Boots that freeze water beneath feet.", effects=[ItemEffect("cold_resist", 1), ItemEffect("cold_resist", 1)], value=180, stackable=False
    ),
    "Shadow Step Shoes": Item(
        name="Shadow Step Shoes", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Silent footwear for stealthy movement.", effects=[ItemEffect("stealth_bonus", 20), ItemEffect("stealth", 1)], value=160, stackable=False
    ),
    "Dragon Hide Boots": Item(
        name="Dragon Hide Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Boots crafted from dragon leather.", effects=[ItemEffect("armor", 4), ItemEffect("fire_resist", 20)], value=190, stackable=False
    ),
    "Lightning Sabatons": Item(
        name="Lightning Sabatons", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Metal boots that conduct electricity.", effects=[ItemEffect("armor", 3), ItemEffect("lightning_damage", 8)], value=170, stackable=False
    ),
    "Earth Shaker Boots": Item(
        name="Earth Shaker Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Heavy boots that create tremors.", effects=[ItemEffect("armor", 5), ItemEffect("damage", 12)], value=150, stackable=False
    ),
    "Crystal Slippers": Item(
        name="Crystal Slippers", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Delicate footwear made of pure crystal.", effects=[ItemEffect("spell_power", 15) ], value=220, stackable=False
    ),
    "Phoenix Down Sandals": Item(
        name="Phoenix Down Sandals", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Sandals lined with phoenix feathers.", effects=[ItemEffect("fire_resist", 1), ItemEffect("regen", 2)], value=250, stackable=False
    ),
    "Void Walker Boots": Item(
        name="Void Walker Boots", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Boots that can step through dimensions.", effects=[ItemEffect("phase_shift", 1), ItemEffect("void_protection", 15)], value=280, stackable=False
    ),
    "Nature's Stride": Item(
        name="Nature's Stride", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.RARE,
        description="Boots that leave no trace in nature.", effects=[ItemEffect("stealth_bonus", 1), ItemEffect("stealth_bonus", 20)], value=140, stackable=False
    ),
    "Flame Tongue Sword": Item(
        name="Flame Tongue Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Blade wreathed in magical fire.", effects=[ItemEffect("damage", 12), ItemEffect("fire_damage", 8)], value=780, stackable=False
    ),
    "Frost Bite Axe": Item(
        name="Frost Bite Axe", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Axe that chills enemies to the bone.", effects=[ItemEffect("damage", 10), ItemEffect("ice_damage", 6), ItemEffect("stun_chance", 15)], value=650, stackable=False
    ),
    "Storm Caller Staff": Item(
        name="Storm Caller Staff", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Staff that commands lightning.", effects=[ItemEffect("magic_damage", 8), ItemEffect("lightning_damage", 10), ItemEffect("storm_call", 1)], value=850, stackable=False
    ),
    "Soul Reaper Scythe": Item(
        name="Soul Reaper Scythe", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Scythe that harvests spiritual energy.", effects=[ItemEffect("damage", 14), ItemEffect("soul_steal", 8), ItemEffect("undead_damage", 20)], value=900, stackable=False
    ),
    "Vampire Fang Dagger": Item(
        name="Vampire Fang Dagger", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.RARE,
        description="Dagger carved from vampire fang.", effects=[ItemEffect("damage", 8), ItemEffect("life_steal", 6), ItemEffect("pierce", 4)], value=420, stackable=False
    ),
    "Ring of Elemental Mastery": Item(
        name="Ring of Elemental Mastery", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="Ring attuned to all elements.", effects=[ItemEffect("fire_damage", 4), ItemEffect("ice_damage", 4), ItemEffect("lightning_damage", 4)], value=650, stackable=False
    ),
    "Band of the Berserker": Item(
        name="Band of the Berserker", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="Ring that unleashes inner fury.", effects=[ItemEffect("damage", 8), ItemEffect("crit_chance", 12), ItemEffect("damage_buff", 5)], value=580, stackable=False
    ),
    "Signet of the Archmage": Item(
        name="Signet of the Archmage", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="Ring of magical authority.", effects=[ItemEffect("spell_power", 8), ItemEffect("mana_regen", 4), ItemEffect("magic_damage", 6)], value=720, stackable=False
    ),
    "Ring of Shadows": Item(
        name="Ring of Shadows", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.RARE,
        description="Ring that bends darkness to your will.", effects=[ItemEffect("stealth_bonus", 10), ItemEffect("void_damage", 6), ItemEffect("phase_shift", 1)], value=680, stackable=False
    ),

# ====================== #
# ===== EPIC Items ===== #
# ====================== #

    "Supreme Healing Potion": Item(
        name="Supreme Healing Potion", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Fully restores health instantly.", effects=[ItemEffect("heal", 50)], value=100, usable=True
    ),
    "Dragonscale Armor": Item(
        name="Dragonscale Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Armor crafted from ancient dragon scales.", 
        effects=[ItemEffect("armor", 12), ItemEffect("fire_resist", 50)], value=300, stackable=False
    ),
    "Flamebrand Sword": Item(
        name="Flamebrand Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="A sword wreathed in eternal flames.", 
        effects=[ItemEffect("damage", 18), ItemEffect("burn", 5, 4)], value=250, stackable=False
    ),
    "Void Crystal": Item(
        name="Void Crystal", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="A crystal from the space between worlds.", effects=[], value=400
    ),
    "Phoenix Feather": Item(
        name="Phoenix Feather", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Resurrects with full health if you die.", effects=[ItemEffect("resurrect", 1)], value=800, usable=True
    ),
    "Archmage Staff": Item(
        name="Archmage Staff", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="A staff of immense magical power.", 
        effects=[ItemEffect("damage", 15), ItemEffect("mana", 25), ItemEffect("spell_power", 50)], value=350, stackable=False
    ),
    "Shadow Cloak": Item(
        name="Shadow Cloak", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.EPIC,
        description="Grants invisibility and stealth bonuses.", 
        effects=[ItemEffect("dodge", 35), ItemEffect("stealth", 1)], value=280, stackable=False
    ),
    "Time Crystal": Item(
        name="Time Crystal", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Grants an extra turn in combat.", effects=[ItemEffect("extra_turn", 1)], value=500, usable=True
    ),
    "Soul Gem": Item(
        name="Soul Gem", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Contains the essence of a powerful spirit.", effects=[], value=600
    ),
    "Elixir of Power": Item(
        name="Elixir of Power", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Permanently increases maximum health.", effects=[ItemEffect("max_hp_bonus", 10)], value=750, usable=True
    ),
    "Dragon Bone Sword": Item(
        name="Dragon Bone Sword", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="Forged from the bones of an ancient dragon.", 
        effects=[ItemEffect("damage", 20), ItemEffect("magic_damage", 8)], value=400, stackable=False
    ),
    "Crown of Wisdom": Item(
        name="Crown of Wisdom", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Grants incredible magical insight.", 
        effects=[ItemEffect("mana_regen", 5), ItemEffect("spell_power", 30)], value=450, stackable=False
    ),
    "Demon Blood": Item(
        name="Demon Blood", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Grants dark power at a cost.", 
        effects=[ItemEffect("damage_buff", 15, 10), ItemEffect("hp_drain", 1)], value=300, usable=True
    ),
    "Angel Wing": Item(
        name="Angel Wing", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Provides divine protection.", 
        effects=[ItemEffect("heal", 30), ItemEffect("divine_shield", 5)], value=400, usable=True
    ),
    "Meteor Fragment": Item(
        name="Meteor Fragment", type=ItemType.MISC, sub_type=ItemSubType.MATERIAL, rarity=ItemRarity.EPIC,
        description="A piece of a fallen star.", effects=[], value=350
    ),
    "Blade of Elements": Item(
        name="Blade of Elements", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="Sword infused with all elemental powers.", effects=[ItemEffect("damage", 22), ItemEffect("fire_damage", 8), ItemEffect("ice_damage", 8), ItemEffect("lightning_damage", 8)], value=500, stackable=False
    ),
    "Armor of the Ancients": Item(
        name="Armor of the Ancients", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Plate mail from a lost civilization.", effects=[ItemEffect("armor", 15), ItemEffect("ancient_wisdom", 1)], value=450, stackable=False
    ),
    "Orb of Storms": Item(
        name="Orb of Storms", type=ItemType.WEAPON, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.EPIC,
        description="Controls weather and lightning.", effects=[ItemEffect("damage", 16), ItemEffect("storm_call", 1)], value=420, stackable=False
    ),
    "Cloak of the Void": Item(
        name="Cloak of the Void", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.EPIC,
        description="Made from the fabric of space itself.", effects=[ItemEffect("void_protection", 80), ItemEffect("phase_shift", 25)], value=600, stackable=False
    ),
    "Elixir of Transcendence": Item(
        name="Elixir of Transcendence", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Temporarily grants godlike powers.", effects=[ItemEffect("damage_buff", 25, 5), ItemEffect("regen", 10, 10)], value=900, usable=True
    ),
    "Staff of Life": Item(
        name="Staff of Life", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="Channels the essence of life itself.", effects=[ItemEffect("damage", 14), ItemEffect("heal_on_kill", 10)], value=380, stackable=False
    ),
    "Demon Horn": Item(
        name="Demon Horn", type=ItemType.MISC, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Horn from a greater demon.", effects=[], value=700
    ),
    "Crystal Heart": Item(
        name="Crystal Heart", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.EPIC,
        description="Replaces your heart with pure energy.", effects=[ItemEffect("max_hp_bonus", 25), ItemEffect("energy_body", 1)], value=1200, usable=True
    ),
    "Wings of Freedom": Item(
        name="Wings of Freedom", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Grants the power of flight.", effects=[ItemEffect("flight", 1), ItemEffect("dodge", 40)], value=800, stackable=False
    ),
    "Sword of Truth": Item(
        name="Sword of Truth", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.EPIC,
        description="Always strikes true and reveals deception.", effects=[ItemEffect("damage", 20), ItemEffect("true_strike", 1), ItemEffect("detect_lies", 1)], value=550, stackable=False
    ),
    "Crown of the Void": Item(
        name="Crown of the Void", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Dark crown that commands otherworldly power.", effects=[ItemEffect("void_damage", 25), ItemEffect("reality_control", 10), ItemEffect("immunity", 1)], value=1200, stackable=False
    ),
    "Helm of Divine Sight": Item(
        name="Helm of Divine Sight", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Allows the wearer to see through illusions.", effects=[ItemEffect("night_vision", 1), ItemEffect("immunity", 1), ItemEffect("spell_power", 25)], value=1500, stackable=False
    ),
    "Phoenix Crown": Item(
        name="Phoenix Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Crown of flames that never burns out.", effects=[ItemEffect("fire_damage", 30), ItemEffect("regen", 8), ItemEffect("regen", 1)], value=1800, stackable=False
    ),
    "Storm King's Circlet": Item(
        name="Storm King's Circlet", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Commands the power of storms and weather.", effects=[ItemEffect("storm_call", 1), ItemEffect("lightning_damage", 35), ItemEffect("immunity", 1)], value=2200, stackable=False
    ),
    "Crystal Mind Crown": Item(
        name="Crystal Mind Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Amplifies mental abilities beyond mortal limits.", effects=[ItemEffect("spell_power", 50), ItemEffect("spell_power", 15), ItemEffect("immunity", 1)], value=2500, stackable=False
    ),
    "Dragonlord Plate": Item(
        name="Dragonlord Plate", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Armor forged from the scales of the Dragon King.", effects=[ItemEffect("armor", 20), ItemEffect("fire_damage", 25), ItemEffect("all_resist", 1)], value=2800, stackable=False
    ),
    "Void Knight Armor": Item(
        name="Void Knight Armor", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Dark plate that exists between dimensions.", effects=[ItemEffect("armor", 18), ItemEffect("phase_shift", 30), ItemEffect("void_damage", 20)], value=3200, stackable=False
    ),
    "Celestial Robes": Item(
        name="Celestial Robes", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Garments woven from starlight itself.", effects=[ItemEffect("cosmic_power", 40), ItemEffect("cosmic_power", 25), ItemEffect("flight", 1)], value=3500, stackable=False
    ),
    "Titan's Embrace": Item(
        name="Titan's Embrace", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.EPIC,
        description="Massive armor that grants giant strength.", effects=[ItemEffect("armor", 25), ItemEffect("damage", 50), ItemEffect("damage", 2)], value=4000, stackable=False
    ),
    "Void Walker Leggings": Item(
        name="Void Walker Leggings", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.EPIC,
        description="Allows movement between planes of existence.", effects=[ItemEffect("phase_shift", 1), ItemEffect("void_protection", 40), ItemEffect("phase_shift", 25)], value=1800, stackable=False
    ),
    "Dragon Lord Greaves": Item(
        name="Dragon Lord Greaves", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.EPIC,
        description="Leg armor from the greatest dragons.", effects=[ItemEffect("armor", 15), ItemEffect("damage", 30), ItemEffect("flight", 1)], value=2200, stackable=False
    ),
    "Time Walker Pants": Item(
        name="Time Walker Pants", type=ItemType.ARMOR, sub_type=ItemSubType.LEGS, rarity=ItemRarity.EPIC,
        description="Allows limited manipulation of time flow.", effects=[ItemEffect("time_control", 25), ItemEffect("immunity", 50), ItemEffect("immunity", 1)], value=2800, stackable=False
    ),
    "Boots of Dimensional Striding": Item(
        name="Boots of Dimensional Striding", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.EPIC,
        description="Walk between worlds with each step.", effects=[ItemEffect("phase_shift", 1), ItemEffect("phase_shift", 3), ItemEffect("immunity", 1)], value=2500, stackable=False
    ),
    "Phoenix Wing Sandals": Item(
        name="Phoenix Wing Sandals", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.EPIC,
        description="Grant true flight like a phoenix.", effects=[ItemEffect("flight", 1), ItemEffect("fire_resist", 1), ItemEffect("resurrect", 1)], value=3000, stackable=False
    ),
    "Sandals of Time": Item(
        name="Sandals of Time", type=ItemType.ARMOR, sub_type=ItemSubType.FOOTWEAR, rarity=ItemRarity.EPIC,
        description="Each step can reverse or accelerate time.", effects=[ItemEffect("time_control", 20), ItemEffect("time_mastery", 1), ItemEffect("time_control", 1)], value=3500, stackable=False
    ),
    "Gauntlets of Creation": Item(
        name="Gauntlets of Creation", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.EPIC,
        description="Can create matter from pure energy.", effects=[ItemEffect("create_matter", 1), ItemEffect("spell_power", 30), ItemEffect("magic_damage", 25)], value=4500, stackable=False
    ),
    "Void Fist Wraps": Item(
        name="Void Fist Wraps", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.EPIC,
        description="Punches that can tear holes in reality.", effects=[ItemEffect("void_damage", 40), ItemEffect("void_damage", 35), ItemEffect("dimensional_rift", 15)], value=3800, stackable=False
    ),
    "Cloak of Stars": Item(
        name="Cloak of Stars", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.EPIC,
        description="Contains the power of entire constellations.", effects=[ItemEffect("cosmic_power", 50), ItemEffect("cosmic_power", 1), ItemEffect("night_vision", 40)], value=3200, stackable=False
    ),
    "Phoenix Feather Mantle": Item(
        name="Phoenix Feather Mantle", type=ItemType.ARMOR, sub_type=ItemSubType.CAPE, rarity=ItemRarity.EPIC,
        description="Grants rebirth after death.", effects=[ItemEffect("resurrect", 2), ItemEffect("fire_resist", 1), ItemEffect("fire_resist", 1)], value=4200, stackable=False
    ),
    "Shield of Eternity": Item(
        name="Shield of Eternity", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.EPIC,
        description="Indestructible shield that blocks anything.", effects=[ItemEffect("block_chance", 1), ItemEffect("immunity", 1), ItemEffect("armor", 1)], value=5000, stackable=False
    ),
    "Orb of Reality": Item(
        name="Orb of Reality", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.EPIC,
        description="Controls the fabric of existence itself.", effects=[ItemEffect("reality_control", 40), ItemEffect("reality_control", 25), ItemEffect("reality_control", 15)], value=6000, stackable=False
    ),
    "Necklace of Souls": Item(
        name="Necklace of Souls", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.EPIC,
        description="Contains the essence of a thousand spirits.", effects=[ItemEffect("soul_steal", 50), ItemEffect("soul_steal", 25), ItemEffect("immunity", 1)], value=4000, stackable=False
    ),
    "Chain of Binding": Item(
        name="Chain of Binding", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.EPIC,
        description="Binds the wearer to cosmic forces.", effects=[ItemEffect("cosmic_power", 1), ItemEffect("cosmic_power", 35), ItemEffect("probability_control", 20)], value=4800, stackable=False
    ),
    "Ring of Omnipotence": Item(
        name="Ring of Omnipotence", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.EPIC,
        description="Grants limited omnipotent abilities.", effects=[ItemEffect("omnipotence", 25), ItemEffect("all_stats", 30), ItemEffect("divine_power", 15)], value=8000, stackable=False
    ),
    "Band of Infinity": Item(
        name="Band of Infinity", type=ItemType.ARMOR, sub_type=ItemSubType.RING, rarity=ItemRarity.EPIC,
        description="Contains infinite power within finite form.", effects=[ItemEffect("mana_regen", 1), ItemEffect("all_stats", 40), ItemEffect("reality_control", 25)], value=9500, stackable=False
    ),
    "Girdle of Titans": Item(
        name="Girdle of Titans", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.EPIC,
        description="Grants the strength of the ancient titans.", effects=[ItemEffect("damage", 60), ItemEffect("damage", 25), ItemEffect("damage", 30)], value=3500, stackable=False
    ),
    "Sash of Dimensions": Item(
        name="Sash of Dimensions", type=ItemType.ARMOR, sub_type=ItemSubType.BELT, rarity=ItemRarity.EPIC,
        description="Links the wearer to all dimensions.", effects=[ItemEffect("phase_shift", 1), ItemEffect("multiverse_control", 35), ItemEffect("immunity", 1)], value=4200, stackable=False
    ),
    "Orb of Infinite Knowledge": Item(
        name="Orb of Infinite Knowledge", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.EPIC,
        description="Contains all knowledge that ever was or will be.", effects=[ItemEffect("infinite_knowledge", 50), ItemEffect("infinite_knowledge", 1), ItemEffect("infinite_knowledge", 40)], value=7500, stackable=False
    ),
    "Crystal of Pure Magic": Item(
        name="Crystal of Pure Magic", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.EPIC,
        description="Crystallized essence of magic itself.", effects=[ItemEffect("spell_power", 60), ItemEffect("spell_power", 1), ItemEffect("mana_regen", 1)], value=6800, stackable=False
    ),
    "Shard of Creation": Item(
        name="Shard of Creation", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.EPIC,
        description="Fragment from the birth of the universe.", effects=[ItemEffect("create_world", 45), ItemEffect("cosmic_power", 1), ItemEffect("create_world", 1)], value=12000, stackable=False
    ),
    "Heart of the World Tree": Item(
        name="Heart of the World Tree", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.EPIC,
        description="The living core of the tree that supports reality.", effects=[ItemEffect("cosmic_power", 80), ItemEffect("heal_on_kill", 60), ItemEffect("reality_control", 1)], value=15000, stackable=False
    ),
    "Fragment of the First Light": Item(
        name="Fragment of the First Light", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.EPIC,
        description="A piece of the light that began creation.", effects=[ItemEffect("light_damage", 100), ItemEffect("infinite_knowledge", 1), ItemEffect("light_damage", 1)], value=18000, stackable=False
    ),
    "Echo of the Last Word": Item(
        name="Echo of the Last Word", type=ItemType.ARMOR, sub_type=ItemSubType.RELIC, rarity=ItemRarity.EPIC,
        description="Contains the word that will end all things.", effects=[ItemEffect("void_damage", 90), ItemEffect("void_damage", 1), ItemEffect("omnipotence", 50)], value=20000, stackable=False
    ),
    "Crown of the Void Lord": Item(
        name="Crown of the Void Lord", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Crown that commands the space between worlds.", effects=[ItemEffect("void_damage", 15), ItemEffect("void_protection", 20), ItemEffect("dimensional_rift", 1), ItemEffect("leadership", 8)], value=4200, stackable=False
    ),
    "Helm of the Dragon King": Item(
        name="Helm of the Dragon King", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Helmet forged from ancient dragon bone.", effects=[ItemEffect("fire_damage", 18), ItemEffect("intimidate", 15), ItemEffect("ancient_wisdom", 2), ItemEffect("armor", 8)], value=3800, stackable=False
    ),
    "Circlet of Time": Item(
        name="Circlet of Time", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.EPIC,
        description="Circlet that grants mastery over time.", effects=[ItemEffect("time_control", 2), ItemEffect("time_mastery", 5), ItemEffect("extra_turn", 1), ItemEffect("spell_power", 10)], value=5500, stackable=False
    ),
    "Amulet of Cosmic Harmony": Item(
        name="Amulet of Cosmic Harmony", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.EPIC,
        description="Pendant that harmonizes with universal forces.", effects=[ItemEffect("cosmic_power", 12), ItemEffect("all_stats", 8), ItemEffect("energy_absorb", 10), ItemEffect("star_control", 1)], value=6800, stackable=False
    ),
    "Necklace of Infinite Lives": Item(
        name="Necklace of Infinite Lives", type=ItemType.ARMOR, sub_type=ItemSubType.AMULET, rarity=ItemRarity.EPIC,
        description="Grants multiple chances at life.", effects=[ItemEffect("resurrect", 3), ItemEffect("immortality", 5), ItemEffect("infinite_regen", 1), ItemEffect("max_hp_bonus", 25)], value=12000, stackable=False
    ),
# ======================= #
# === LEGENDARY Items === #
# ======================= #

    "Godslayer Blade": Item(
        name="Godslayer Blade", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.LEGENDARY,
        description="A weapon capable of harming divine beings.", 
        effects=[ItemEffect("damage", 40), ItemEffect("divine_damage", 50), ItemEffect("crit_chance", 25)], 
        value=2000, stackable=False
    ),
    "Crown of Eternity": Item(
        name="Crown of Eternity", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.LEGENDARY,
        description="Grants dominion over time and space.", 
        effects=[ItemEffect("all_resist", 90), ItemEffect("time_control", 1), ItemEffect("max_hp_bonus", 50)], 
        value=5000, stackable=False
    ),
    "Philosopher's Stone": Item(
        name="Philosopher's Stone", type=ItemType.MISC, sub_type=ItemSubType.RELIC, rarity=ItemRarity.LEGENDARY,
        description="The ultimate alchemical creation.", effects=[], value=10000
    ),
    "World Tree Essence": Item(
        name="World Tree Essence", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.LEGENDARY,
        description="Essence from the tree that supports all worlds.", 
        effects=[ItemEffect("heal", 999), ItemEffect("max_hp_bonus", 100), ItemEffect("level_bonus", 5)], 
        value=15000, usable=True
    ),
    "Infinity Gauntlet": Item(
        name="Infinity Gauntlet", type=ItemType.ARMOR, sub_type=ItemSubType.HANDS, rarity=ItemRarity.LEGENDARY,
        description="Controls the fundamental forces of reality.", 
        effects=[ItemEffect("damage", 60), ItemEffect("armor", 30), ItemEffect("reality_control", 1)], 
        value=25000, stackable=False
    ),
    "Dragon Heart": Item(
        name="Dragon Heart", type=ItemType.MISC, sub_type=ItemSubType.RELIC, rarity=ItemRarity.LEGENDARY,
        description="The still-beating heart of an ancient dragon.", effects=[], value=12000
    ),
    "Excalibur": Item(
        name="Excalibur", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.LEGENDARY,
        description="The legendary sword of kings.", 
        effects=[ItemEffect("damage", 50), ItemEffect("light_damage", 30), ItemEffect("leadership", 1)], 
        value=20000, stackable=False
    ),
    "Ambrosia": Item(
        name="Ambrosia", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.LEGENDARY,
        description="Food of the gods, grants temporary immortality.", 
        effects=[ItemEffect("immortality", 10), ItemEffect("heal", 999)], value=30000, usable=True
    ),
    "Reality Anchor": Item(
        name="Reality Anchor", type=ItemType.MISC, sub_type=ItemSubType.RELIC, rarity=ItemRarity.LEGENDARY,
        description="Prevents reality from being altered.", effects=[], value=18000
    ),
    "Genesis Crystal": Item(
        name="Genesis Crystal", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.LEGENDARY,
        description="Contains the power of creation itself.", effects=[ItemEffect("create_world", 1)], 
        value=50000, usable=True
    ),
    "Crown of All Realities": Item(
        name="Crown of All Realities", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.LEGENDARY,
        description="Rules over all possible universes and timelines.", effects=[ItemEffect("multiverse_control", 100), ItemEffect("reality_control", 80), ItemEffect("time_mastery", 60)], value=50000, stackable=False
    ),
    "Diadem of the First God": Item(
        name="Diadem of the First God", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.LEGENDARY,
        description="Worn by the deity who created existence.", effects=[ItemEffect("divine_power", 100), ItemEffect("create_world", 90), ItemEffect("divine_power", 1)], value=75000, stackable=False
    ),
    "Armor of the Universe Forge": Item(
        name="Armor of the Universe Forge", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.LEGENDARY,
        description="Worn by the smith who forged the cosmos.", effects=[ItemEffect("create_world", 100), ItemEffect("reality_control", 80), ItemEffect("cosmic_power", 1)], value=80000, stackable=False
    ),
    "Robes of Infinite Wisdom": Item(
        name="Robes of Infinite Wisdom", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.LEGENDARY,
        description="Contains all wisdom across all realities.", effects=[ItemEffect("infinite_knowledge", 100), ItemEffect("infinite_knowledge", 1), ItemEffect("detect_lies", 1)], value=65000, stackable=False
    ),
    "Blade of Universe Sundering": Item(
        name="Blade of Universe Sundering", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.LEGENDARY,
        description="Can cut through the fabric of reality itself.", effects=[ItemEffect("damage", 200), ItemEffect("void_damage", 100), ItemEffect("void_damage", 80)], value=100000, stackable=False
    ),
    "Staff of Creation": Item(
        name="Staff of Creation", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.LEGENDARY,
        description="The tool used to build the first universe.", effects=[ItemEffect("create_world", 100), ItemEffect("create_world", 1), ItemEffect("create_matter", 90)], value=120000, stackable=False
    ),

# ====================== #
# ==== MYTHIC Items ==== #
# ====================== #   
  
    "Void Reaper": Item(
        name="Void Reaper", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.MYTHIC,
        description="A scythe that harvests the essence of reality itself.",
        effects=[ItemEffect("damage", 150), ItemEffect("void_damage", 100), ItemEffect("soul_steal", 50)],
        value=500000, stackable=False
    ),
    "Omnipotence Orb": Item(
        name="Omnipotence Orb", type=ItemType.ARMOR, sub_type=ItemSubType.OFF_HAND, rarity=ItemRarity.MYTHIC,
        description="Grants absolute power over all existence.",
        effects=[ItemEffect("all_stats", 100), ItemEffect("immunity", 100), ItemEffect("omnipotence", 1)],
        value=1000000, stackable=False
    ),
    "Nectar of Ascension": Item(
        name="Nectar of Ascension", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.MYTHIC,
        description="Transforms the drinker into a deity.",
        effects=[ItemEffect("ascend", 1), ItemEffect("max_hp_bonus", 1000), ItemEffect("divine_power", 100)],
        value=2000000, usable=True
    ),
    "Primordial Essence": Item(
        name="Primordial Essence", type=ItemType.MISC, sub_type=ItemSubType.RELIC, rarity=ItemRarity.MYTHIC,
        description="The fundamental building block of all creation.",
        effects=[], value=5000000
    ),
    "Cosmic Crown": Item(
        name="Cosmic Crown", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.MYTHIC,
        description="Commands the forces of the universe itself.",
        effects=[ItemEffect("cosmic_power", 1), ItemEffect("star_control", 1), ItemEffect("time_mastery", 1)],
        value=1500000, stackable=False
    ),
    "Universe Forge": Item(
        name="Universe Forge", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.MYTHIC,
        description="The hammer used to create worlds.",
        effects=[ItemEffect("damage", 300), ItemEffect("create_matter", 1), ItemEffect("dimensional_rift", 1)],
        value=3000000, stackable=False
    ),
    "Elixir of Eternity": Item(
        name="Elixir of Eternity", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.MYTHIC,
        description="Grants true immortality beyond death itself.",
        effects=[ItemEffect("true_immortality", 1), ItemEffect("infinite_regen", 1)],
        value=10000000, usable=True
    ),
    "Reality Engine": Item(
        name="Reality Engine", type=ItemType.MISC, sub_type=ItemSubType.RELIC, rarity=ItemRarity.MYTHIC,
        description="A device that can rewrite the laws of physics.",
        effects=[], value=8000000
    ),
    "Soul of the Multiverse": Item(
        name="Soul of the Multiverse", type=ItemType.CONSUMABLE, sub_type=ItemSubType.CONSUMABLE, rarity=ItemRarity.MYTHIC,
        description="Contains the collective consciousness of all realities.",
        effects=[ItemEffect("multiverse_control", 1), ItemEffect("infinite_knowledge", 1)],
        value=25000000, usable=True
    ),
    "Quantum Blade": Item(
        name="Quantum Blade", type=ItemType.WEAPON, sub_type=ItemSubType.MAIN_HAND, rarity=ItemRarity.MYTHIC,
        description="Exists in all possible states simultaneously.",
        effects=[ItemEffect("damage", 250), ItemEffect("quantum_strike", 1), ItemEffect("probability_control", 50)],
        value=4000000, stackable=False
    ),    
    "Crown of Absolute Existence": Item(
        name="Crown of Absolute Existence", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.MYTHIC,
        description="Represents the concept of existence itself.", effects=[ItemEffect("omnipotence", 1), ItemEffect("reality_control", 200), ItemEffect("omnipotence", 1)], value=500000, stackable=False
    ),
    "Circlet of Pure Thought": Item(
        name="Circlet of Pure Thought", type=ItemType.ARMOR, sub_type=ItemSubType.HEADGEAR, rarity=ItemRarity.MYTHIC,
        description="The crystallized essence of thought itself.", effects=[ItemEffect("infinite_knowledge", 1), ItemEffect("infinite_knowledge", 300), ItemEffect("infinite_knowledge", 1)], value=750000, stackable=False
    ),
    "Armor of Conceptual Protection": Item(
        name="Armor of Conceptual Protection", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.MYTHIC,
        description="Protects against abstract concepts and ideas.", effects=[ItemEffect("immunity", 1), ItemEffect("immunity", 500), ItemEffect("immunity", 1)], value=800000, stackable=False
    ),
    "Vestments of Pure Logic": Item(
        name="Vestments of Pure Logic", type=ItemType.ARMOR, sub_type=ItemSubType.ARMOR, rarity=ItemRarity.MYTHIC,
        description="Embodies mathematical perfection and reason.", effects=[ItemEffect("infinite_knowledge", 1), ItemEffect("infinite_knowledge", 400), ItemEffect("infinite_knowledge", 1)], value=900000, stackable=False
    ),
    "Paradox Engine": Item(
        name="Paradox Engine", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.MYTHIC,
        description="A device that creates and resolves paradoxes.", effects=[ItemEffect("reality_control", 1), ItemEffect("reality_control", 300), ItemEffect("reality_control", 1)], value=2000000, stackable=False
    ),
    "Essence of Everything": Item(
        name="Essence of Everything", type=ItemType.ARMOR, sub_type=ItemSubType.TRINKET, rarity=ItemRarity.MYTHIC,
        description="Contains a fragment of all that exists.", effects=[ItemEffect("cosmic_power", 1), ItemEffect("omnipotence", 500), ItemEffect("reality_control", 1)], value=5000000, stackable=False
    )
}

_LOWER_INDEX = {k.lower(): k for k in ITEMS.keys()}

def get_item(name: str):
    if not name:
        return None
    # exact first
    it = ITEMS.get(name)
    if it:
        return it
    # case-insensitive
    key = _LOWER_INDEX.get(name.lower())
    return ITEMS.get(key) if key else None

def get_item_case_insensitive(name: str) -> Optional[Item]:
    if not name:
        return None
    lower_map = {k.lower(): v for k, v in ITEMS.items()}
    return lower_map.get(name.strip().lower())

def get_items_by_type(item_type: ItemType) -> List[Item]:
    """Get all items of a specific type."""
    return [item for item in ITEMS.values() if item.type == item_type]

def get_items_by_rarity(rarity: ItemRarity) -> List[Item]:
    """Get all items of a specific rarity."""
    return [item for item in ITEMS.values() if item.rarity == rarity]