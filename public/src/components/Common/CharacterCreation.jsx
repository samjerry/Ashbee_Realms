/**
 * CharacterCreation.jsx
 * Interactive character creation flow for new players
 */

import React, { useState } from 'react';
import { Sword, Shield, Sparkles, Wind, Heart } from 'lucide-react';

export default function CharacterCreation({ onComplete }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
  const [characterName, setCharacterName] = useState('');

  const classes = [
    {
      id: 'warrior',
      name: 'Warrior',
      icon: Sword,
      color: 'red',
      description: 'Masters of melee combat with high attack and defense',
      stats: { attack: '⭐⭐⭐⭐⭐', defense: '⭐⭐⭐⭐', magic: '⭐', agility: '⭐⭐' },
      playstyle: 'Tank and deal massive physical damage',
      startingGear: 'Iron Sword, Leather Armor, Wooden Shield'
    },
    {
      id: 'mage',
      name: 'Mage',
      icon: Sparkles,
      color: 'blue',
      description: 'Wielders of arcane magic with devastating spells',
      stats: { attack: '⭐⭐', defense: '⭐⭐', magic: '⭐⭐⭐⭐⭐', agility: '⭐⭐' },
      playstyle: 'Cast powerful spells from range',
      startingGear: 'Wooden Staff, Apprentice Robes, Mana Crystal'
    },
    {
      id: 'rogue',
      name: 'Rogue',
      icon: Wind,
      color: 'purple',
      description: 'Swift assassins with high critical hit chance',
      stats: { attack: '⭐⭐⭐', defense: '⭐⭐', magic: '⭐', agility: '⭐⭐⭐⭐⭐' },
      playstyle: 'Strike fast with critical hits',
      startingGear: 'Dual Daggers, Leather Vest, Lockpicks'
    },
    {
      id: 'cleric',
      name: 'Cleric',
      icon: Heart,
      color: 'green',
      description: 'Holy warriors who heal and protect allies',
      stats: { attack: '⭐⭐', defense: '⭐⭐⭐⭐', magic: '⭐⭐⭐⭐', agility: '⭐⭐' },
      playstyle: 'Support with healing and buffs',
      startingGear: 'Mace, Chainmail, Holy Symbol'
    },
    {
      id: 'ranger',
      name: 'Ranger',
      icon: Shield,
      color: 'yellow',
      description: 'Skilled hunters with ranged weapons and nature magic',
      stats: { attack: '⭐⭐⭐', defense: '⭐⭐⭐', magic: '⭐⭐', agility: '⭐⭐⭐⭐' },
      playstyle: 'Balanced combat and utility',
      startingGear: 'Longbow, Leather Armor, Quiver of Arrows'
    }
  ];

  const difficulties = [
    {
      id: 'normal',
      name: 'Normal Mode',
      description: 'Standard difficulty. Death loses 10% gold and 25% XP.',
      recommended: true,
      color: 'green'
    },
    {
      id: 'hardcore',
      name: 'Hardcore Mode',
      description: '⚠️ Character is DELETED on death! Permanent progression unlocks persist.',
      recommended: false,
      color: 'red'
    }
  ];

  const handleComplete = () => {
    if (selectedClass && characterName.trim()) {
      onComplete({
        class: selectedClass,
        difficulty: selectedDifficulty,
        name: characterName.trim()
      });
    }
  };

  const colorClasses = {
    red: 'border-red-500 bg-red-900/20',
    blue: 'border-blue-500 bg-blue-900/20',
    purple: 'border-purple-500 bg-purple-900/20',
    green: 'border-green-500 bg-green-900/20',
    yellow: 'border-yellow-500 bg-yellow-900/20'
  };

  const selectedColorClasses = {
    red: 'border-red-400 bg-red-800/40 ring-2 ring-red-400',
    blue: 'border-blue-400 bg-blue-800/40 ring-2 ring-blue-400',
    purple: 'border-purple-400 bg-purple-800/40 ring-2 ring-purple-400',
    green: 'border-green-400 bg-green-800/40 ring-2 ring-green-400',
    yellow: 'border-yellow-400 bg-yellow-800/40 ring-2 ring-yellow-400'
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Character</h1>
          <p className="text-gray-400">Choose your class and begin your journey in Ashbee Realms</p>
        </div>

        {/* Character Name */}
        <div className="mb-8">
          <label className="block text-white font-semibold mb-2">Character Name</label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Enter your character name..."
            maxLength={20}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Class Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Select Your Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classInfo) => {
              const Icon = classInfo.icon;
              const isSelected = selectedClass === classInfo.id;
              
              return (
                <button
                  key={classInfo.id}
                  onClick={() => setSelectedClass(classInfo.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? selectedColorClasses[classInfo.color]
                      : `${colorClasses[classInfo.color]} hover:border-${classInfo.color}-400`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={32} className={`text-${classInfo.color}-400`} />
                    <h3 className="text-xl font-bold text-white">{classInfo.name}</h3>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">{classInfo.description}</p>
                  
                  <div className="space-y-1 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Attack:</span>
                      <span className="text-yellow-400">{classInfo.stats.attack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Defense:</span>
                      <span className="text-blue-400">{classInfo.stats.defense}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Magic:</span>
                      <span className="text-purple-400">{classInfo.stats.magic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Agility:</span>
                      <span className="text-green-400">{classInfo.stats.agility}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <p className="text-xs text-gray-400">
                      <strong className="text-white">Playstyle:</strong> {classInfo.playstyle}
                    </p>
                    <p className="text-xs text-gray-400">
                      <strong className="text-white">Starting Gear:</strong> {classInfo.startingGear}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedDifficulty === diff.id
                    ? `border-${diff.color}-400 bg-${diff.color}-900/40 ring-2 ring-${diff.color}-400`
                    : `border-gray-700 bg-gray-800 hover:border-${diff.color}-500`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{diff.name}</h3>
                  {diff.recommended && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm">{diff.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <div className="text-center">
          <button
            onClick={handleComplete}
            disabled={!selectedClass || !characterName.trim()}
            className={`px-8 py-4 rounded-lg text-lg font-bold transition-all ${
              selectedClass && characterName.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Begin Your Adventure
          </button>
          
          {(!selectedClass || !characterName.trim()) && (
            <p className="text-red-400 text-sm mt-2">
              Please enter a name and select a class to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
