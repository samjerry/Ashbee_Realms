import React, { useState } from 'react';
import { Sword, Shield, Zap, FlaskConical, X } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const CombatView = () => {
  const { combat, combatLog, player, performCombatAction, endCombat } = useGameStore();
  const [selectedAction, setSelectedAction] = useState(null);
  
  if (!combat || !player) return null;
  
  const { monster, playerHp } = combat;
  const playerHpPercent = (playerHp / player.maxHp) * 100;
  const monsterHpPercent = (monster.hp / monster.maxHp) * 100;
  
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Close button */}
        <button
          onClick={endCombat}
          className="absolute top-6 right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="card p-8 space-y-6">
          {/* Combat Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Combat</h1>
            <p className="text-xl text-gray-400">vs {monster.name}</p>
          </div>
          
          {/* Combatants */}
          <div className="grid grid-cols-2 gap-12">
            {/* Player */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white font-bold text-5xl mb-4">
                  {player.level}
                </div>
                <h3 className="text-2xl font-bold text-white">{player.username}</h3>
                <p className="text-gray-400">{player.class} • Level {player.level}</p>
              </div>
              
              <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>HP</span>
                  <span>{playerHp} / {player.maxHp}</span>
                </div>
                <div className="hp-bar h-8">
                  <div 
                    className={`hp-fill ${selectedAction ? 'combat-hit' : ''}`}
                    style={{ width: `${playerHpPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
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
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-8xl mb-4">{monster.icon || '👹'}</div>
                <h3 className="text-2xl font-bold text-white">{monster.name}</h3>
                <p className="text-gray-400">Level {monster.level}</p>
              </div>
              
              <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>HP</span>
                  <span>{monster.hp} / {monster.maxHp}</span>
                </div>
                <div className="hp-bar h-8">
                  <div 
                    className="hp-fill"
                    style={{ width: `${monsterHpPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
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
          <div className="bg-dark-900 rounded-lg p-4 border border-dark-700 h-48 overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-3">Combat Log</h3>
            {combatLog.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Waiting for action...</p>
            ) : (
              <div className="space-y-2">
                {combatLog.map((log, index) => (
                  <p key={index} className="text-gray-300 text-sm">
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="grid grid-cols-4 gap-4">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={selectedAction !== null}
                  className={`${action.color} text-white p-6 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon size={32} className="mx-auto mb-2" />
                  <p className="font-bold">{action.label}</p>
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
