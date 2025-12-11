import React from 'react';
import { Sword, Shield, Zap, Wind, Heart, Star } from 'lucide-react';
import useGameStore from '../../store/gameStore';

// Force rebuild - fixed null safety issues
const CharacterSheet = () => {
  const { player } = useGameStore();
  
  if (!player) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-400">No character data available. Please log in via Twitch.</p>
      </div>
    );
  }
  
  // Provide default values if stats don't exist
  const stats = player.stats || {};
  const statList = [
    { label: 'Attack', value: stats.attack || 0, icon: Sword, color: 'text-red-500' },
    { label: 'Defense', value: stats.defense || 0, icon: Shield, color: 'text-blue-500' },
    { label: 'Magic', value: stats.magic || 0, icon: Zap, color: 'text-purple-500' },
    { label: 'Agility', value: stats.agility || 0, icon: Wind, color: 'text-green-500' },
    { label: 'Max HP', value: player.maxHp || 100, icon: Heart, color: 'text-pink-500' },
    { label: 'Crit Chance', value: `${stats.critChance || 5}%`, icon: Star, color: 'text-yellow-500' },
  ];
  
  const equipment = player.equipment || {};
  const slots = ['weapon', 'armor', 'helmet', 'accessory'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Character Overview */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto sm:mx-0 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-4xl sm:text-5xl shadow-lg flex-shrink-0">
            {player.level || 1}
          </div>
          
          <div className="flex-1 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center sm:text-left">{player.username || 'Unknown'}</h1>
            <p className="text-base sm:text-lg text-gray-400 mb-4 text-center sm:text-left">{player.class || 'Adventurer'} • Level {player.level || 1}</p>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Total XP</p>
                <p className="text-lg sm:text-xl font-bold text-white">{(player.totalXp || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Gold</p>
                <p className="text-lg sm:text-xl font-bold text-yellow-500">{(player.gold || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Deaths</p>
                <p className="text-lg sm:text-xl font-bold text-red-500">{player.deaths || 0}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Playtime</p>
                <p className="text-lg sm:text-xl font-bold text-green-500">{Math.floor((player.playtime || 0) / 60)}h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {statList.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-dark-900 rounded-lg p-3 sm:p-4 border border-dark-700">
                <div className="flex items-center space-x-3">
                  <Icon size={20} className={`${stat.color} flex-shrink-0 sm:w-6 sm:h-6`} />
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Equipment */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Equipment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {slots.map((slot) => {
            const item = equipment[slot];
            return (
              <div key={slot} className="bg-dark-900 rounded-lg p-3 sm:p-4 border border-dark-700">
                <p className="text-xs sm:text-sm text-gray-400 mb-2 capitalize">{slot}</p>
                {item ? (
                  <div>
                    <p className={`font-bold rarity-${item.rarity} text-sm sm:text-base`}>{item.name}</p>
                    <div className="mt-2 space-y-1 text-xs text-gray-400">
                      {item.stats && Object.entries(item.stats).map(([key, value]) => (
                        <p key={key}>+{value} {key}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Empty</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Active Effects */}
      {player.activeEffects && player.activeEffects.length > 0 && (
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Active Effects</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {player.activeEffects.map((effect, index) => (
              <div key={index} className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                <p className="font-bold text-white">{effect.name}</p>
                <p className="text-sm text-gray-400">{effect.duration} turns remaining</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterSheet;
