import React from 'react';
import { Heart, Droplet, TrendingUp, Coins } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const Header = () => {
  const { player } = useGameStore();
  
  if (!player) return null;
  
  const hpPercent = (player.hp / player.maxHp) * 100;
  const manaPercent = player.mana ? (player.mana / player.maxMana) * 100 : 0;
  const xpPercent = (player.xp / player.xpToNextLevel) * 100;

  return (
    <header className="bg-dark-900 border-b border-dark-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Player info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {player.level}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{player.username}</h2>
              <p className="text-sm text-gray-400">{player.class} • Level {player.level}</p>
            </div>
          </div>
        </div>
        
        {/* Stats bars */}
        <div className="flex-1 max-w-2xl mx-6 space-y-2">
          {/* HP Bar */}
          <div className="flex items-center space-x-3">
            <Heart size={20} className="text-red-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>HP</span>
                <span>{player.hp} / {player.maxHp}</span>
              </div>
              <div className="hp-bar">
                <div 
                  className="hp-fill" 
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Mana Bar */}
          {player.mana !== undefined && (
            <div className="flex items-center space-x-3">
              <Droplet size={20} className="text-blue-500" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Mana</span>
                  <span>{player.mana} / {player.maxMana}</span>
                </div>
                <div className="mana-bar">
                  <div 
                    className="mana-fill" 
                    style={{ width: `${manaPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* XP Bar */}
          <div className="flex items-center space-x-3">
            <TrendingUp size={20} className="text-green-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>XP</span>
                <span>{player.xp} / {player.xpToNextLevel}</span>
              </div>
              <div className="xp-bar">
                <div 
                  className="xp-fill" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Gold */}
        <div className="flex items-center space-x-2 bg-dark-800 px-4 py-2 rounded-lg border border-dark-700">
          <Coins size={20} className="text-yellow-500" />
          <span className="text-lg font-bold text-yellow-500">{(player.gold || 0).toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
