import React from 'react';
import { ArrowLeft, Zap } from 'lucide-react';

const FightSubmenu = ({ state, onAction, onBack, player, disabled }) => {
  if (state !== 'fight') {
    return null;
  }

  // TODO: Get player's actual equipped abilities from player.skills or player.abilities
  // For now, using mock data for UI demonstration
  const abilities = [
    {
      id: 'ability1',
      name: 'Power Strike',
      mpCost: 10,
      cooldown: 0,
      icon: '⭐'
    },
    {
      id: 'ability2',
      name: 'Shield Bash',
      mpCost: 15,
      cooldown: 0,
      icon: '⭐'
    },
    {
      id: 'ability3',
      name: 'Fireball',
      mpCost: 20,
      cooldown: 0,
      icon: '⭐'
    }
  ];

  const canUseAbility = (ability) => {
    // Check if player has enough MP and ability is not on cooldown
    const playerMp = player?.mp || 0;
    return playerMp >= ability.mpCost && ability.cooldown === 0;
  };

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
        {abilities.map((ability, index) => {
          const usable = canUseAbility(ability);
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
                  <span className="text-2xl">{ability.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-base">{ability.name}</div>
                    <div className="text-xs opacity-75">
                      MP Cost: {ability.mpCost}
                      {ability.cooldown > 0 && ` • Cooldown: ${ability.cooldown} turns`}
                    </div>
                  </div>
                </div>
                {!usable && (
                  <div className="text-xs bg-dark-900 px-2 py-1 rounded">
                    {ability.cooldown > 0 ? 'ON COOLDOWN' : 'NOT ENOUGH MP'}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FightSubmenu;
