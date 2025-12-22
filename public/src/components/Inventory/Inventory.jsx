import React, { useEffect, useState } from 'react';
import { Package, Trash2, ArrowUpCircle } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import { getRarityColor, getRarityTextClass } from '../../utils/rarityHelpers';

const Inventory = () => {
  const { inventory, equipment, fetchInventory, equipItem, player } = useGameStore();
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [itemToEquip, setItemToEquip] = useState(null);
  const [currentlyEquipped, setCurrentlyEquipped] = useState(null);
  
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
  
  // Helper function to check if item is equippable
  const isEquippableItem = (item) => {
    return item.type === 'weapon' || item.type === 'armor' || item.category === 'equipment';
  };
  
  const filteredInventory = safeInventory.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'equipment') {
      return isEquippableItem(item);
    }
    return item.type === filter;
  });
  
  const itemTypes = ['all', 'equipment', 'weapon', 'armor', 'consumable', 'material', 'quest', 'misc'];

  // Helper function to determine equipment slot from item data
  const getItemSlot = (item) => {
    // Use explicit slot if available
    if (item.slot) return item.slot;
    
    // Fallback slot detection based on type
    const type = item.type?.toLowerCase();
    if (type === 'weapon') return 'main_hand';
    if (type === 'shield') return 'off_hand';
    if (type === 'helmet' || type === 'headgear') return 'helmet';
    if (type === 'armor' || type === 'chest') return 'chest';
    if (type === 'legs') return 'legs';
    if (type === 'boots' || type === 'footwear') return 'boots';
    if (type === 'gloves' || type === 'hands') return 'hands';
    if (type === 'cape') return 'cape';
    if (type === 'amulet') return 'amulet';
    if (type === 'ring') {
      // Check if ring1 is occupied
      if (!equipment?.ring1) return 'ring1';
      if (!equipment?.ring2) return 'ring2';
      return 'ring1'; // Default to ring1 for swap
    }
    if (type === 'belt') return 'belt';
    
    return 'main_hand'; // Default fallback
  };

  // Handle equip button click
  const handleEquipClick = (item) => {
    const itemSlot = getItemSlot(item);
    const equippedInSlot = equipment?.[itemSlot];
    
    if (equippedInSlot) {
      // Slot occupied - show comparison
      setItemToEquip(item);
      setCurrentlyEquipped(equippedInSlot);
      setComparisonMode(true);
    } else {
      // Slot empty - equip directly
      equipItemDirectly(item);
    }
  };

  // Equip item directly when slot is empty
  const equipItemDirectly = async (item) => {
    try {
      const channel = player?.channel;
      if (!channel) {
        alert('Channel information missing');
        return;
      }

      const response = await fetch('/api/player/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          itemId: item.id,
          channel: channel
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        await fetchInventory();
        alert(`Equipped ${item.name}!`);
      } else {
        alert(`Failed to equip: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error equipping item:', error);
      alert('Failed to equip item');
    }
  };

  // Handle equipment swap from comparison modal
  const handleSwapEquipment = async (action) => {
    if (action === 'keep') {
      // Just close the modal
      setComparisonMode(false);
      return;
    }
    
    if (action === 'swap') {
      try {
        const channel = player?.channel;
        if (!channel) {
          alert('Channel information missing');
          setComparisonMode(false);
          return;
        }

        // Call API to equip new item (backend handles unequipping automatically)
        const response = await fetch('/api/player/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            itemId: itemToEquip.id,
            channel: channel
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          // Refresh inventory and equipment
          await fetchInventory();
          setComparisonMode(false);
          setItemToEquip(null);
          setCurrentlyEquipped(null);
          
          // Show success message
          alert(`Equipped ${itemToEquip.name}! ${currentlyEquipped.name} moved to inventory.`);
        } else {
          alert(`Failed to equip: ${result.error || result.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error swapping equipment:', error);
        alert('Failed to swap equipment');
      }
    }
  };


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
                  <div key={index} className="relative">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className={`w-full aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-all hover:scale-105 ${getRarityBorderColor(item.rarity)} ${
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
                    
                    {/* Add Equip Button for Equipment Items */}
                    {isEquippableItem(item) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipClick(item);
                        }}
                        className="absolute bottom-1 right-1 bg-primary-600 hover:bg-primary-700 text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        Equip
                      </button>
                    )}
                  </div>
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
      
      {/* Equipment Comparison Modal */}
      {comparisonMode && itemToEquip && currentlyEquipped && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-4xl w-full p-6 border border-dark-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Compare Equipment
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currently Equipped Item */}
              <div className="bg-dark-900 rounded-lg p-4 border-2 border-primary-600">
                <div className="text-center mb-3">
                  <span className="bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                    ✓ Currently Equipped
                  </span>
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">{currentlyEquipped.icon || '⚔️'}</div>
                  <h3 className={`text-xl font-bold ${getRarityTextClass(currentlyEquipped.rarity)}`}>
                    {currentlyEquipped.name}
                  </h3>
                  <p className="text-gray-400 text-sm capitalize">{getItemSlot(currentlyEquipped)}</p>
                </div>
                
                {/* Stats Display */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white border-b border-dark-700 pb-2">Stats:</p>
                  {Object.entries(currentlyEquipped.stats || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                      <span className="text-green-400">+{value}</span>
                    </div>
                  ))}
                </div>
                
                {/* Select Button */}
                <button
                  onClick={() => handleSwapEquipment('keep')}
                  className="w-full mt-4 bg-dark-700 hover:bg-dark-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Keep Equipped
                </button>
              </div>
              
              {/* Item from Inventory */}
              <div className="bg-dark-900 rounded-lg p-4 border-2 border-blue-600">
                <div className="text-center mb-3">
                  <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                    From Inventory
                  </span>
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">{itemToEquip.icon || '⚔️'}</div>
                  <h3 className={`text-xl font-bold ${getRarityTextClass(itemToEquip.rarity)}`}>
                    {itemToEquip.name}
                  </h3>
                  <p className="text-gray-400 text-sm capitalize">{getItemSlot(itemToEquip)}</p>
                </div>
                
                {/* Stats Display with Comparison */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white border-b border-dark-700 pb-2">Stats:</p>
                  {Object.entries(itemToEquip.stats || {}).map(([key, value]) => {
                    const currentValue = currentlyEquipped.stats?.[key] || 0;
                    const difference = value - currentValue;
                    const isUpgrade = difference > 0;
                    
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className={isUpgrade ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-gray-400'}>
                            +{value}
                          </span>
                          {difference !== 0 && (
                            <span className={`text-xs ${isUpgrade ? 'text-green-400' : 'text-red-400'}`}>
                              ({isUpgrade ? '+' : ''}{difference})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Select Button */}
                <button
                  onClick={() => handleSwapEquipment('swap')}
                  className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors font-bold"
                >
                  Equip This Item
                </button>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setComparisonMode(false)}
              className="mt-6 w-full bg-dark-700 hover:bg-dark-600 text-gray-400 py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
