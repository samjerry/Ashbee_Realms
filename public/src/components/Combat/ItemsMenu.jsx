import React, { useState, useEffect } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';

const ItemsMenu = ({ state, onUseItem, onBack, inventory, disabled }) => {
  const [usableItems, setUsableItems] = useState([]);

  useEffect(() => {
    if (state === 'items' && inventory) {
      // Filter inventory for consumable items
      const consumables = inventory.filter(item => {
        // Check if item has consumable tag or is a known consumable type
        const tags = item.tags || [];
        return tags.includes('consumable') || tags.includes('healing') || 
               item.type === 'health' || item.type === 'mana' || item.type === 'buff';
      });

      // Group by item ID and count quantities
      const itemMap = new Map();
      consumables.forEach(item => {
        if (itemMap.has(item.id)) {
          const existing = itemMap.get(item.id);
          // If item has quantity property, use it; otherwise count as 1
          const itemQty = item.quantity || 1;
          existing.quantity += itemQty;
        } else {
          itemMap.set(item.id, {
            id: item.id,
            name: item.name || item.id,
            description: item.description || item.effect || 'Consumable item',
            quantity: item.quantity || 1,
            icon: getItemIcon(item)
          });
        }
      });

      setUsableItems(Array.from(itemMap.values()));
    }
  }, [state, inventory]);

  const getItemIcon = (item) => {
    const tags = item.tags || [];
    if (tags.includes('healing') || item.type === 'health') return '🧪';
    if (item.type === 'mana' || item.id?.includes('mana')) return '💙';
    if (item.type === 'buff') return '⚗️';
    if (tags.includes('food')) return '🍞';
    return '🔮';
  };

  if (state !== 'items') {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={disabled}
        className="w-full bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-dark-600"
      >
        <ArrowLeft size={20} />
        <span className="font-bold">BACK</span>
      </button>

      {/* Items List */}
      {usableItems.length === 0 ? (
        <div className="text-center py-8 bg-dark-800 rounded-lg border border-dark-700">
          <FlaskConical size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No usable items in inventory</p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {usableItems.map(item => (
            <button
              key={item.id}
              onClick={() => onUseItem(item.id)}
              disabled={disabled || item.quantity === 0}
              className={`w-full p-4 rounded-lg transition-all text-left ${
                item.quantity > 0
                  ? 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'
                  : 'bg-dark-700 opacity-50 cursor-not-allowed'
              } text-white`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-base">{item.name}</div>
                    <div className="text-sm opacity-75">{item.description}</div>
                  </div>
                </div>
                <div className="bg-dark-900 px-3 py-1 rounded text-sm font-bold">
                  x{item.quantity}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemsMenu;
