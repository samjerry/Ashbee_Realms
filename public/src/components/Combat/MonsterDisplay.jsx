import React from 'react';
import StatusEffectDisplay from './StatusEffectDisplay';

const MonsterDisplay = ({ monster }) => {
  if (!monster) return null;

  const hpPercent = ((monster.hp || 0) / (monster.maxHp || 1)) * 100;

  // Get HP bar color based on percentage
  const getHpBarColor = (percent) => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-dark-900 rounded-lg p-4 sm:p-6 border border-dark-700">
      {/* Monster Icon/Image */}
      <div className="text-center mb-4">
        <div className="text-7xl sm:text-8xl md:text-9xl mb-3">
          {monster.icon || '👹'}
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
          {monster.name}
        </h3>
        <p className="text-sm sm:text-base text-gray-400">Level {monster.level}</p>
      </div>

      {/* HP Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
          <span>HP</span>
          <span>{monster.hp} / {monster.maxHp}</span>
        </div>
        <div className="h-6 sm:h-8 bg-dark-800 rounded-full overflow-hidden border border-dark-700">
          <div 
            className={`h-full transition-all duration-500 ${getHpBarColor(hpPercent)}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Status Effects */}
      <StatusEffectDisplay effects={monster.status_effects || []} target="monster" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mt-3">
        <div className="bg-dark-800 rounded p-2 border border-dark-700">
          <p className="text-gray-400">Attack</p>
          <p className="text-white font-bold text-base sm:text-lg">{monster.attack}</p>
        </div>
        <div className="bg-dark-800 rounded p-2 border border-dark-700">
          <p className="text-gray-400">Defense</p>
          <p className="text-white font-bold text-base sm:text-lg">{monster.defense}</p>
        </div>
      </div>
    </div>
  );
};

export default MonsterDisplay;
