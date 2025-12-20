import React from 'react';
import { Heart, Sword, Shield, MapPin } from 'lucide-react';
import { getRarityTextClass } from '../../utils/rarityHelpers';

const MonsterCard = ({ entry }) => {
  const { name, description, level_range, stats, rarity, encountered, defeated, encounter_count, defeat_count, icon } = entry;

  // Determine rarity border color
  const rarityBorderColors = {
    common: 'border-[#B0B0B0]',
    uncommon: 'border-[#2ECC71]',
    rare: 'border-[#3498DB]',
    epic: 'border-[#9B59B6]',
    legendary: 'border-[#F1C40F]',
    mythic: 'border-[#FF3B3B]'
  };

  const rarityBorderColor = rarityBorderColors[rarity] || rarityBorderColors.common;

  // Stats array format: [HP, Attack, Defense, Agility]
  const hp = stats?.[0] || 0;
  const attack = stats?.[1] || 0;
  const defense = stats?.[2] || 0;

  return (
    <div className={`bg-dark-800 rounded-lg border-2 ${rarityBorderColor} p-4 hover:shadow-lg transition-all hover:scale-105`}>
      {/* Monster Icon/Image */}
      <div className="relative mb-3">
        <div className={`text-6xl text-center mb-2 ${!defeated ? 'grayscale opacity-50' : ''}`}>
          {icon || '👹'}
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-0 right-0">
          {defeated ? (
            <div className="bg-green-600 text-white text-xs px-2 py-1 rounded">
              Defeated
            </div>
          ) : encountered ? (
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
              Encountered
            </div>
          ) : null}
        </div>
      </div>

      {/* Monster Name */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
        <p className="text-xs text-gray-400 line-clamp-2">{description}</p>
      </div>

      {/* Level Range */}
      {level_range && (
        <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
          <span>Level {level_range[0]}-{level_range[1]}</span>
          <span className="mx-1">•</span>
          <span className={getRarityTextClass(rarity)}>{rarity}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-dark-900 rounded p-2 text-center border border-dark-700">
          <Heart size={16} className="mx-auto mb-1 text-red-400" />
          <p className="text-xs text-gray-400">HP</p>
          <p className="text-sm font-bold text-white">{hp}</p>
        </div>
        <div className="bg-dark-900 rounded p-2 text-center border border-dark-700">
          <Sword size={16} className="mx-auto mb-1 text-orange-400" />
          <p className="text-xs text-gray-400">ATK</p>
          <p className="text-sm font-bold text-white">{attack}</p>
        </div>
        <div className="bg-dark-900 rounded p-2 text-center border border-dark-700">
          <Shield size={16} className="mx-auto mb-1 text-blue-400" />
          <p className="text-xs text-gray-400">DEF</p>
          <p className="text-sm font-bold text-white">{defense}</p>
        </div>
      </div>

      {/* Encounter/Defeat Counts */}
      {encountered && (
        <div className="border-t border-dark-700 pt-2 mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Encounters:</span>
            <span className="text-blue-400 font-bold">{encounter_count || 0}</span>
          </div>
          {defeated && (
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">Defeats:</span>
              <span className="text-green-400 font-bold">{defeat_count || 0}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonsterCard;
