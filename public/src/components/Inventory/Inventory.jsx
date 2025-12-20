import React, { useEffect, useState } from 'react';
import { Package, Trash2, ArrowUpCircle } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import { getRarityColor, getRarityTextClass } from '../../utils/rarityHelpers';

const Inventory = () => {
  const { inventory, equipment, fetchInventory, equipItem } = useGameStore();
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchInventory();
  }, []);
  
  // Default to empty array if inventory is undefined
  const safeInventory = inventory || [];
  
  const getRarityBorderColor = (rarity) => {
    const colors = {
      common: 'border-[#B0B0B0] bg-gray-900/50',
      uncommon: 'border-[#2ECC71] bg-green-900/20',
      rare: 'border-[#3498DB] bg-blue-900/20',
      epic: 'border-[#9B59B6] bg-purple-900/20',
      legendary: 'border-[#F1C40F] bg-yellow-900/20',
      mythic: 'border-[#FF3B3B] bg-red-900/20',
    };
    return colors[rarity] || colors.common;
  };
  
  const filteredInventory = safeInventory.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });
  
  const itemTypes = ['all', 'weapon', 'armor', 'consumable', 'material', 'quest', 'misc'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Package size={24} className="sm:w-8 sm:h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Inventory</h1>
              <p className="text-sm sm:text-base text-gray-400">{safeInventory.length} / 100 items</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {itemTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg capitalize transition-all text-sm ${
                  filter === type 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Item Grid */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Items</h2>
            {filteredInventory.length === 0 ? (
              <p className="text-gray-500 text-center py-8 sm:py-12 text-sm sm:text-base">No items found</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 gap-2 sm:gap-3">
                {filteredInventory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedItem(item)}
                    className={`aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-all hover:scale-105 ${getRarityBorderColor(item.rarity)} ${
                      selectedItem?.id === item.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <div className="text-3xl mb-2">{item.icon || '📦'}</div>
                    <p className={`text-xs font-bold text-center ${getRarityTextClass(item.rarity)}`}>
                      {item.name}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-400">x{item.quantity}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Item Details */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <div className="text-4xl mb-3 text-center">{selectedItem.icon || '📦'}</div>
                  <h3 className={`text-2xl font-bold text-center ${getRarityTextClass(selectedItem.rarity)}`}>
                    {selectedItem.name}
                  </h3>
                  <p className="text-center text-gray-400 capitalize">{selectedItem.type}</p>
                </div>
                
                {selectedItem.description && (
                  <p className="text-gray-300 text-sm">{selectedItem.description}</p>
                )}
                
                {selectedItem.stats && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-white">Stats:</p>
                    {Object.entries(selectedItem.stats).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400 capitalize">{key}</span>
                        <span className="text-green-400">+{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedItem.value && (
                  <div className="flex justify-between text-sm border-t border-dark-700 pt-3">
                    <span className="text-gray-400">Value</span>
                    <span className="text-yellow-500">{selectedItem.value} gold</span>
                  </div>
                )}
                
                {/* Actions */}
                <div className="space-y-2 pt-4">
                  {selectedItem.type === 'weapon' || selectedItem.type === 'armor' ? (
                    <button
                      onClick={() => equipItem(selectedItem.id, selectedItem.slot)}
                      className="btn-primary w-full flex items-center justify-center space-x-2"
                    >
                      <ArrowUpCircle size={20} />
                      <span>Equip</span>
                    </button>
                  ) : null}
                  
                  {selectedItem.type === 'consumable' ? (
                    <button className="btn-success w-full">
                      Use
                    </button>
                  ) : null}
                  
                  <button className="btn-secondary w-full">
                    Sell ({Math.floor(selectedItem.value * 0.4)} gold)
                  </button>
                  
                  <button className="btn-danger w-full flex items-center justify-center space-x-2">
                    <Trash2 size={16} />
                    <span>Destroy</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select an item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
