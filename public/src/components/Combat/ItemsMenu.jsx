import React from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';

const ItemsMenu = ({ state, onUseItem, onBack, inventory, disabled }) => {
  if (state !== 'items') {
    return null;
  }

  // Filter for usable items in combat (potions, consumables)
  const usableItems = [
    {
      id: 'health_potion',
      name: 'Health Potion',
      description: 'Restores 50 HP',
      quantity: 3,
      icon: '🧪'
    },
    {
      id: 'mana_potion',
      name: 'Mana Potion',
      description: 'Restores 30 MP',
      quantity: 2,
      icon: '💙'
    },
    {
      id: 'stamina_elixir',
      name: 'Stamina Elixir',
      description: 'Removes debuffs',
      quantity: 1,
      icon: '⚗️'
    }
  ];

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
