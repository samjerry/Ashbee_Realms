import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';

const FightSubmenu = ({ state, onAction, onBack, player, disabled }) => {
  const [abilities, setAbilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state === 'fight') {
      loadEquippedAbilities();
    }
  }, [state]);

  const loadEquippedAbilities = async () => {
    try {
      const response = await fetch('/api/abilities/equipped');
      const data = await response.json();
      setAbilities(data.abilities || []);
    } catch (error) {
      console.error('Failed to load equipped abilities:', error);
      setAbilities([]);
    } finally {
      setLoading(false);
    }
  };

  const canUseAbility = (ability) => {
    // Check if ability is on cooldown
    const abilityCooldowns = player?.ability_cooldowns || {};
    const cooldown = abilityCooldowns[ability.id] || 0;
    return cooldown === 0;
  };

  const getAbilityIcon = (ability) => {
    // Return icon based on ability tags
    if (ability.tags?.includes('healing')) return '💚';
    if (ability.tags?.includes('damage')) return '⚔️';
    if (ability.tags?.includes('melee')) return '🗡️';
    if (ability.tags?.includes('magic')) return '✨';
    if (ability.tags?.includes('defense')) return '🛡️';
    if (ability.tags?.includes('control')) return '🌀';
    return '⭐';
  };

  if (state !== 'fight') {
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

      {/* Weapon Attack */}
      <button
        onClick={() => onAction('attack')}
        disabled={disabled}
        className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div className="text-left">
              <div className="font-bold text-base">WEAPON ATTACK</div>
              <div className="text-xs opacity-75">Basic attack with equipped weapon</div>
            </div>
          </div>
        </div>
      </button>

      {/* Abilities */}
      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="text-center text-gray-400 py-4">
            Loading abilities...
          </div>
        ) : abilities.length === 0 ? (
          <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center text-gray-400">
            <Zap size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No abilities equipped</p>
            <p className="text-xs mt-1">Equip abilities in the Character menu</p>
          </div>
        ) : (
          abilities.map((ability) => {
            const usable = canUseAbility(ability);
            const abilityCooldowns = player?.ability_cooldowns || {};
            const cooldown = abilityCooldowns[ability.id] || 0;
            
            return (
              <button
                key={ability.id}
                onClick={() => onAction(ability.id)}
                disabled={disabled || !usable}
                className={`p-4 rounded-lg transition-all ${
                  usable
                    ? 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95'
                    : 'bg-dark-700 opacity-50 cursor-not-allowed'
                } text-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAbilityIcon(ability)}</span>
                    <div className="text-left">
                      <div className="font-bold text-base">{ability.name}</div>
                      <div className="text-xs opacity-75">
                        {ability.description}
                        {ability.cooldown > 0 && ` • Cooldown: ${ability.cooldown} turns`}
                      </div>
                    </div>
                  </div>
                  {!usable && cooldown > 0 && (
                    <div className="text-xs bg-dark-900 px-2 py-1 rounded">
                      COOLDOWN: {cooldown}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FightSubmenu;
