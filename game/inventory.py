from dataclasses import dataclass, field
from typing import Dict, List, Optional
from .items import Item, get_item

from typing import Optional, Iterable

from difflib import get_close_matches

def _norm(s: str) -> str:
    """Normalize inventory strings for comparison."""
    return s.strip().lower()

def find_inventory_match(inventory: list[str], query: str) -> tuple[str | None, list[str]]:
    if not query:
        return None, []
    qn = _norm(query)

    # 1) exact normalized match
    norm_map = { _norm(name): name for name in inventory }
    if qn in norm_map:
        return norm_map[qn], []

    # 2) prefix / contains matches (normalized)
    for n_norm, raw in norm_map.items():
        if n_norm.startswith(qn) or qn in n_norm:
            return raw, []

    # 3) fuzzy suggestions (show top 3)
    candidates = list(norm_map.keys())
    close = get_close_matches(qn, candidates, n=3, cutoff=0.6)
    suggestions = [norm_map[c] for c in close]
    return None, suggestions

@dataclass
class InventorySlot:
    """Represents a slot in the inventory."""
    item: Item
    quantity: int = 1

    def to_json(self) -> Dict:
        return {
            "item_name": self.item.name,
            "quantity": self.quantity
        }

    @staticmethod
    def from_json(data: Dict) -> "InventorySlot":
        item = get_item(data["item_name"])
        if not item:
            raise ValueError(f"Unknown item: {data['item_name']}")
        return InventorySlot(item, data["quantity"])

@dataclass
class Inventory:
    """Player inventory system with proper item management."""
    slots: List[InventorySlot] = field(default_factory=list)
    max_slots: int = 20

    def to_json(self) -> List[Dict]:
        return [slot.to_json() for slot in self.slots]

    @staticmethod
    def from_json(data: List[Dict]) -> "Inventory":
        slots = [InventorySlot.from_json(slot_data) for slot_data in data]
        return Inventory(slots)

    def add_item(self, item: Item, quantity: int = 1) -> bool:
        """Add item to inventory. Returns True if successful."""
        if item.stackable:
            # Try to stack with existing item
            for slot in self.slots:
                if slot.item.name == item.name:
                    slot.quantity += quantity
                    return True
        
        # Create new slot if we have space
        if len(self.slots) < self.max_slots:
            self.slots.append(InventorySlot(item, quantity))
            return True
        
        return False  # Inventory full

    def remove_item(self, item_name: str, quantity: int = 1) -> bool:
        """Remove item from inventory. Returns True if successful."""
        for i, slot in enumerate(self.slots):
            if slot.item.name.lower() == item_name.lower():
                if slot.quantity >= quantity:
                    slot.quantity -= quantity
                    if slot.quantity <= 0:
                        self.slots.pop(i)
                    return True
        return False

    def has_item(self, item_name: str, quantity: int = 1) -> bool:
        """Check if inventory contains item."""
        for slot in self.slots:
            if slot.item.name.lower() == item_name.lower():
                return slot.quantity >= quantity
        return False

    def get_item_count(self, item_name: str) -> int:
        """Get total count of specific item."""
        for slot in self.slots:
            if slot.item.name.lower() == item_name.lower():
                return slot.quantity
        return 0

    def get_consumables(self) -> List[InventorySlot]:
        """Get all consumable items."""
        return [slot for slot in self.slots if slot.item.usable]

    def get_display_string(self) -> str:
        """Get formatted string for display."""
        if not self.slots:
            return "empty"
        
        items = []
        for slot in self.slots:
            if slot.quantity > 1:
                items.append(f"{slot.item.name} x{slot.quantity}")
            else:
                items.append(slot.item.name)
        
        return ", ".join(items)

    def use_item(self, item_name: str, player) -> str:
        """Use an item from inventory."""
        item = get_item(item_name)
        if not item:
            return f"Unknown item: {item_name}"
        
        if not self.has_item(item_name):
            return f"You don't have a {item.name}."
        
        if not item.can_use(player):
            return f"Cannot use {item.name}."
        
        result = item.use(player)
        self.remove_item(item_name)
        return result