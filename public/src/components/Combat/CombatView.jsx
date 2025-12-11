import React, { useState } from 'react';
import { Sword, Shield, Zap, FlaskConical, X } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const CombatView = () => {
  const { combat, combatLog, player, performCombatAction, endCombat } = useGameStore();
  const [selectedAction, setSelectedAction] = useState(null);
  
  if (!combat || !player) return null;
  
  const { monster, playerHp } = combat;
  const safeCombatLog = combatLog || [];
  const playerHpPercent = (playerHp / (player.maxHp || 100)) * 100;
  const monsterHpPercent = ((monster.hp || 0) / (monster.maxHp || 1)) * 100;
  
  const actions = [
    { id: 'attack', icon: Sword, label: 'Attack', color: 'bg-red-600 hover:bg-red-700' },
    { id: 'defend', icon: Shield, label: 'Defend', color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'ability', icon: Zap, label: 'Ability', color: 'bg-purple-600 hover:bg-purple-700' },
    { id: 'item', icon: FlaskConical, label: 'Item', color: 'bg-green-600 hover:bg-green-700' },
  ];
  
  const handleAction = async (actionId) => {
    setSelectedAction(actionId);
    await performCombatAction(actionId);
    setTimeout(() => setSelectedAction(null), 500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl my-auto">
        {/* Close button */}
        <button
          onClick={endCombat}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <div className="card p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Combat Title */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Combat</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400">vs {monster.name}</p>
          </div>
          
          {/* Combatants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {/* Player */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
                  {player.level}
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{player.username}</h3>
                <p className="text-sm sm:text-base text-gray-400">{player.class} • Level {player.level}</p>
              </div>
              
              <div className="bg-dark-900 rounded-lg p-3 sm:p-4 border border-dark-700">
                <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                  <span>HP</span>
                  <span>{playerHp} / {player.maxHp}</span>
                </div>
                <div className="hp-bar h-6 sm:h-8">
                  <div 
                    className={`hp-fill ${selectedAction ? 'combat-hit' : ''}`}
                    style={{ width: `${playerHpPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="bg-dark-900 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Attack</p>
                  <p className="text-white font-bold">{player.stats.attack}</p>
                </div>
                <div className="bg-dark-900 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Defense</p>
                  <p className="text-white font-bold">{player.stats.defense}</p>
                </div>
              </div>
            </div>
            
            {/* Monster */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl md:text-8xl mb-3 sm:mb-4">{monster.icon || '👹'}</div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{monster.name}</h3>
                <p className="text-sm sm:text-base text-gray-400">Level {monster.level}</p>
              </div>
              
              <div className="bg-dark-900 rounded-lg p-3 sm:p-4 border border-dark-700">
                <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                  <span>HP</span>
                  <span>{monster.hp} / {monster.maxHp}</span>
                </div>
                <div className="hp-bar h-6 sm:h-8">
                  <div 
                    className="hp-fill"
                    style={{ width: `${monsterHpPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="bg-dark-900 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Attack</p>
                  <p className="text-white font-bold">{monster.attack}</p>
                </div>
                <div className="bg-dark-900 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Defense</p>
                  <p className="text-white font-bold">{monster.defense}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Combat Log */}
          <div className="bg-dark-900 rounded-lg p-3 sm:p-4 border border-dark-700 h-32 sm:h-40 md:h-48 overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Combat Log</h3>
            {combatLog.length === 0 ? (
              <p className="text-gray-500 text-center py-4 sm:py-8 text-sm sm:text-base">Waiting for action...</p>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {combatLog.map((log, index) => (
                  <p key={index} className="text-gray-300 text-xs sm:text-sm">
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {actions.map(action => {
              const Icon = action.icon;
              const buttonClasses = [
                action.color,
                'text-white',
                'p-4 sm:p-5 md:p-6',
                'rounded-lg',
                'transition-all',
                'hover:scale-105',
                'active:scale-95',
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
                '[touch-action:manipulation]',
                'min-h-[60px] sm:min-h-0'
              ].join(' ');
              
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={selectedAction !== null}
                  className={buttonClasses}
                >
                  <Icon size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2" />
                  <p className="font-bold text-xs sm:text-sm md:text-base">{action.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatView;
