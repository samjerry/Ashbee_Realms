import React, { useState, useEffect } from 'react';
import { Zap, Lock, BookOpen, X, CheckCircle } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import { getRarityColor, getRarityTextClass, isMythicRarity } from '../../utils/rarityHelpers';

const AbilitiesMenu = () => {
  const { player } = useGameStore();
  const [abilities, setAbilities] = useState([]);
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [equippedAbilities, setEquippedAbilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAbilities();
  }, [player]);

  const loadAbilities = async () => {
    try {
      const response = await fetch('/api/abilities');
      const data = await response.json();
      setAbilities(data.abilities || []);
      setEquippedAbilities(data.equipped || []);
    } catch (error) {
      console.error('Failed to load abilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const equipAbility = async (abilityId) => {
    if (player?.inCombat) {
      alert('Cannot change abilities during combat!');
      return;
    }

    if (equippedAbilities.length >= 3 && !equippedAbilities.includes(abilityId)) {
      alert('You can only equip 3 abilities at a time. Unequip one first.');
      return;
    }

    try {
      const response = await fetch('/api/abilities/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityId })
      });

      if (response.ok) {
        const data = await response.json();
        setEquippedAbilities(data.equipped);
      }
    } catch (error) {
      console.error('Failed to equip ability:', error);
    }
  };

  const unequipAbility = async (abilityId) => {
    if (player?.inCombat) {
      alert('Cannot change abilities during combat!');
      return;
    }

    try {
      const response = await fetch('/api/abilities/unequip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityId })
      });

      if (response.ok) {
        const data = await response.json();
        setEquippedAbilities(data.equipped);
      }
    } catch (error) {
      console.error('Failed to unequip ability:', error);
    }
  };

  const getRarityColor = (unlockType) => {
    switch (unlockType) {
      case 'level': return 'text-blue-400';
      case 'scroll': return 'text-purple-400';
      case 'trainer': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getUnlockText = (ability) => {
    if (ability.unlocked) return 'Unlocked';
    
    switch (ability.unlock_type) {
      case 'level':
        return `Unlocks at Level ${ability.unlock_requirement}`;
      case 'scroll':
        return `Requires ${ability.unlock_requirement}`;
      case 'trainer':
        return `Learn from ${ability.unlock_requirement}`;
      default:
        return 'Locked';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading abilities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Equipped Abilities Section */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Zap className="mr-2" size={24} />
          Equipped Abilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[0, 1, 2].map((index) => {
            const abilityId = equippedAbilities[index];
            const ability = abilities.find(a => a.id === abilityId);
            
            return (
              <div
                key={index}
                className={`relative bg-dark-900 border-2 rounded-lg p-4 min-h-[120px] ${
                  ability ? 'border-primary-600' : 'border-dark-700 border-dashed'
                }`}
              >
                {ability ? (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-bold ${ability.rarity ? getRarityTextClass(ability.rarity) : 'text-white'}`}>
                        {ability.name}
                      </h3>
                      <button
                        onClick={() => unequipAbility(ability.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Unequip"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{ability.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-400">Cooldown: {ability.cooldown}T</span>
                      <span className="text-yellow-400">Slot {index + 1}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600">
                    <div className="text-center">
                      <Zap size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Empty Slot</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {player?.inCombat && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            ⚠️ Cannot change abilities during combat
          </div>
        )}
      </div>

      {/* All Abilities Section */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <BookOpen className="mr-2" size={24} />
          All Abilities - {player?.class || 'Unknown'} Class
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {abilities.map((ability) => {
            const isEquipped = equippedAbilities.includes(ability.id);
            const isLocked = !ability.unlocked;
            
            return (
              <div
                key={ability.id}
                className={`relative bg-dark-900 border rounded-lg p-4 transition-all ${
                  isLocked 
                    ? 'opacity-60 border-dark-700' 
                    : isEquipped
                    ? 'border-primary-600 shadow-lg shadow-primary-900/50'
                    : 'border-dark-700 hover:border-dark-600 cursor-pointer'
                }`}
                onClick={() => setSelectedAbility(ability)}
              >
                {/* Equipped Badge */}
                {isEquipped && (
                  <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle size={12} className="mr-1" />
                    Equipped
                  </div>
                )}

                {/* Lock Icon */}
                {isLocked && (
                  <div className="absolute top-2 right-2 text-gray-600">
                    <Lock size={20} />
                  </div>
                )}

                <h3 className={`font-bold mb-2 ${
                  isLocked 
                    ? 'text-gray-500' 
                    : ability.rarity 
                    ? getRarityTextClass(ability.rarity)
                    : 'text-white'
                }`}>
                  {ability.name}
                </h3>
                
                {/* Rarity Badge */}
                {!isLocked && ability.rarity && (
                  <div className={`text-xs font-semibold mb-2 ${getRarityTextClass(ability.rarity)}`}>
                    {ability.rarity.charAt(0).toUpperCase() + ability.rarity.slice(1)}
                  </div>
                )}
                
                <p className={`text-sm mb-3 ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>
                  {ability.description}
                </p>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cooldown:</span>
                    <span className="text-blue-400">{ability.cooldown} turns</span>
                  </div>
                  
                  {ability.cost && ability.cost.type !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cost:</span>
                      <span className="text-yellow-400">{ability.cost.amount} {ability.cost.type}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Unlock:</span>
                    <span className={getRarityColor(ability.unlock_type)}>
                      {getUnlockText(ability)}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {ability.tags && ability.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {ability.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-dark-800 text-gray-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Equip Button */}
                {!isLocked && !isEquipped && equippedAbilities.length < 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      equipAbility(ability.id);
                    }}
                    className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    disabled={player?.inCombat}
                  >
                    Equip Ability
                  </button>
                )}

                {isEquipped && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unequipAbility(ability.id);
                    }}
                    className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    disabled={player?.inCombat}
                  >
                    Unequip
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ability Detail Modal */}
      {selectedAbility && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className={`text-2xl font-bold ${selectedAbility.rarity ? getRarityTextClass(selectedAbility.rarity) : 'text-white'}`}>
                  {selectedAbility.name}
                </h2>
                {selectedAbility.rarity && (
                  <p className={`text-sm mt-1 ${getRarityTextClass(selectedAbility.rarity)}`}>
                    {selectedAbility.rarity.charAt(0).toUpperCase() + selectedAbility.rarity.slice(1)} Ability
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedAbility(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-300 mb-4">{selectedAbility.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-dark-800 p-3 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Cooldown</p>
                <p className="text-lg font-bold text-blue-400">{selectedAbility.cooldown} turns</p>
              </div>
              
              {selectedAbility.cost && selectedAbility.cost.type !== 'none' && (
                <div className="bg-dark-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Cost</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {selectedAbility.cost.amount} {selectedAbility.cost.type}
                  </p>
                </div>
              )}
            </div>

            {selectedAbility.effects && (
              <div className="bg-dark-800 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-white mb-2">Effects</h3>
                <pre className="text-sm text-gray-400 whitespace-pre-wrap">
                  {JSON.stringify(selectedAbility.effects, null, 2)}
                </pre>
              </div>
            )}

            {!selectedAbility.unlocked && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-sm">
                🔒 {getUnlockText(selectedAbility)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AbilitiesMenu;
