/**
 * CharacterCreation.jsx
 * Interactive character creation flow for new players
 */

import React, { useState, useEffect } from 'react';
import { Sword, Shield, Sparkles, Wind, Heart, Crown, Award, Gem, Star, User, Eye, Beaker } from 'lucide-react';
import { getRoleBadges as getRoleBadgesHelper } from '../../utils/roleHelpers';

export default function CharacterCreation({ onComplete }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [userRoles, setUserRoles] = useState(null);
  const [selectedRoleBadge, setSelectedRoleBadge] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's Twitch roles and display name on mount
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/player/roles')
      .then(res => {
        if (! res.ok) throw new Error('Failed to fetch roles');
        return res.json();
      })
      .then(data => {
        console.log('Roles API response:', data); // Debug log
        setUserRoles(data);
        
        // Use displayName from API or fallback
        const name = data.displayName || 'Adventurer';
        console.log('Setting displayName to:', name);
        setDisplayName(name);
        
        // If user has only one role, auto-select it
        if (data.availableColors && data.availableColors.length === 1) {
          setSelectedRoleBadge(data.availableColors[0]. role);
        } else if (data.availableColors && data.availableColors.length > 0) {
          // Default to primary role
          setSelectedRoleBadge(data.availableColors[0].role);
        } else {
          // Fallback to viewer
          setSelectedRoleBadge('viewer');
        }
      })
      .catch(err => {
        console.error('Failed to fetch roles:', err);
        // Set fallback values so character creation can still work
        setDisplayName('Adventurer');
        setSelectedRoleBadge('viewer');
        setUserRoles({ roles: ['viewer'], availableColors: [{ role: 'viewer', color: '#FFFFFF', name: 'Viewer' }] });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Get the icon for the selected role badge
  const getRoleIcon = (role) => {
    const icons = {
      creator: Eye,
      streamer: Crown,
      moderator: Shield,
      vip:  Gem,
      subscriber: Star,
      tester:  Beaker,
      viewer: User
    };
    return icons[role] || User;
  };

  // Get the color for the selected role badge
  const getRoleColor = (role) => {
    if (! userRoles || !userRoles. availableColors) return '#FFFFFF';
    const roleData = userRoles.availableColors.find(r => r.role === role);
    return roleData ? roleData. color : '#FFFFFF';
  };

  // Helper function to render stars with filled and empty versions
  const renderStars = (filledCount, maxStars = 10) => {
    const filled = '⭐'.repeat(filledCount);
    const empty = '⭐'.repeat(maxStars - filledCount);
    return (
      <span className="whitespace-nowrap">
        <span style={{ filter: 'none' }}>{filled}</span>
        <span style={{ opacity: 0.2, filter: 'grayscale(100%)' }}>{empty}</span>
      </span>
    );
  };

  const classes = [
    {
      id: 'warrior',
      name: 'Warrior',
      icon: Sword,
      color: 'red',
      description: 'Masters of melee combat with high strength and constitution',
      stats: { 
        strength: 10, 
        dexterity: 3, 
        constitution: 8, 
        intelligence: 1, 
        wisdom: 3 
      },
      playstyle: 'Tank and deal massive physical damage',
      startingGear: 'Iron Sword, Leather Armor, Wooden Shield'
    },
    {
      id: 'mage',
      name: 'Mage',
      icon: Sparkles,
      color: 'blue',
      description: 'Wielders of arcane forces with devastating magical abilities',
      stats: { 
        strength: 1, 
        dexterity: 3, 
        constitution: 4, 
        intelligence: 10, 
        wisdom: 7 
      },
      playstyle: 'Cast powerful spells from range',
      startingGear:  'Wooden Staff, Apprentice Robes, Mana Crystal'
    },
    {
      id: 'rogue',
      name: 'Rogue',
      icon:  Wind,
      color: 'purple',
      description: 'Swift assassins with exceptional dexterity and finesse',
      stats: { 
        strength: 4, 
        dexterity: 10, 
        constitution: 5, 
        intelligence: 3, 
        wisdom: 3 
      },
      playstyle: 'Strike fast with critical hits',
      startingGear:  'Dual Daggers, Leather Vest, Lockpicks'
    },
    {
      id: 'cleric',
      name: 'Cleric',
      icon:  Heart,
      color: 'white',
      description: 'Holy warriors blessed with divine wisdom and healing power',
      stats: { 
        strength: 4, 
        dexterity: 3, 
        constitution: 6, 
        intelligence: 4, 
        wisdom: 10 
      },
      playstyle: 'Support with healing and buffs',
      startingGear: 'Mace, Chainmail, Holy Symbol'
    },
    {
      id: 'ranger',
      name: 'Ranger',
      icon: Star,
      color: 'yellow',
      description: 'Skilled hunters with ranged weapons and high dexterity',
      stats:  { 
        strength: 5, 
        dexterity: 9, 
        constitution: 5, 
        intelligence: 3, 
        wisdom: 6 
      },
      playstyle: 'Balanced combat and utility',
      startingGear:  'Longbow, Leather Armor, Quiver of Arrows'
    },
    {
      id: 'paladin',
      name: 'Paladin',
      icon:  Shield,
      color: 'yellow',
      description: 'Holy knights who blend combat prowess with divine magic (Requested by PalaJen)',
      stats: { 
        strength: 6, 
        dexterity: 1, 
        constitution: 10, 
        intelligence: 3, 
        wisdom: 8 
      },
      playstyle: 'Tank, heal, and smite with holy power',
      startingGear: 'Iron Mace, Chainmail Vest, Holy Symbol'
    }
  ];

  const handleComplete = () => {
    if (selectedClass && selectedRoleBadge) {
      const roleColor = getRoleColor(selectedRoleBadge);
      onComplete({
        class: selectedClass,
        nameColor: roleColor,
        selectedRoleBadge: selectedRoleBadge
      });
    }
  };

  const colorClasses = {
    red: 'border-red-500 bg-red-900/20',
    blue: 'border-blue-500 bg-blue-900/20',
    purple: 'border-purple-500 bg-purple-900/20',
    green: 'border-green-500 bg-green-900/20',
    amber: 'border-amber-500 bg-amber-900/20',
    yellow: 'border-yellow-500 bg-yellow-900/20'
  };

  const selectedColorClasses = {
    red:  'border-red-400 bg-red-800/40 ring-2 ring-red-400',
    blue: 'border-blue-400 bg-blue-800/40 ring-2 ring-blue-400',
    purple: 'border-purple-400 bg-purple-800/40 ring-2 ring-purple-400',
    green: 'border-green-400 bg-green-800/40 ring-2 ring-green-400',
    amber: 'border-amber-400 bg-amber-800/40 ring-2 ring-amber-400',
    yellow: 'border-yellow-400 bg-yellow-800/40 ring-2 ring-yellow-400'
  };

  // Show loading screen while fetching user data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500 mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Your Profile...</h2>
          <p className="text-gray-400">Fetching your Twitch information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Character</h1>
          <p className="text-gray-400">Choose your class and begin your journey in Ashbee Realms</p>
        </div>

        {/* Role Display and Selection */}
        {userRoles && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Select Your Display Role</h3>
            <p className="text-sm text-gray-400 mb-4">
              {userRoles.availableColors && userRoles.availableColors. length > 1
                ? 'You have multiple roles.  Choose which one to display (icon + color come together):'
                : 'Your display role: '}
            </p>
            
            {/* Role Selection - Package deal (icon + color) */}
            <div className="flex flex-wrap gap-3">
              {userRoles. availableColors && userRoles. availableColors.map(({ role, color, name }) => {
                const RoleIcon = getRoleIcon(role);
                const isSelected = selectedRoleBadge === role;
                
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleBadge(role)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-white bg-gray-700 shadow-lg scale-105'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }`}
                  >
                    <RoleIcon size={20} style={{ color }} />
                    <span className="font-semibold capitalize" style={{ color }}>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Character Name Preview */}
        <div className="mb-8">
          <label className="block text-white font-semibold mb-2">Your Character</label>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
            {displayName ?  (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Name:</span>
                <span className="font-semibold flex items-center gap-1 text-xl" style={{ color: getRoleColor(selectedRoleBadge) }}>
                  {(() => {
                    const RoleIcon = getRoleIcon(selectedRoleBadge);
                    return <RoleIcon size={20} style={{ color:  getRoleColor(selectedRoleBadge) }} />;
                  })()}
                  {displayName}
                </span>
              </div>
            ) : (
              <div className="text-gray-400">Loading your Twitch information...</div>
            )}
          </div>
        </div>

        {/* Class Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Select Your Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes. map((classInfo) => {
              const Icon = classInfo.icon;
              const isSelected = selectedClass === classInfo. id;
              
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
                      <span className="text-gray-400">Strength (STR):</span>
                      <span>{renderStars(classInfo.stats. strength)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dexterity (DEX):</span>
                      <span>{renderStars(classInfo. stats.dexterity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Constitution (CON):</span>
                      <span>{renderStars(classInfo.stats. constitution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Intelligence (INT):</span>
                      <span>{renderStars(classInfo. stats.intelligence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wisdom (WIS):</span>
                      <span>{renderStars(classInfo.stats.wisdom)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <p className="text-xs text-gray-400">
                      <strong className="text-white">Playstyle:</strong> {classInfo. playstyle}
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

        {/* Difficulty is set by streamer, not individual players */}
        
        {/* Create Button */}
        <div className="text-center">
          <button
            onClick={handleComplete}
            disabled={!selectedClass}
            className={`px-8 py-4 rounded-lg text-lg font-bold transition-all ${
              selectedClass
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Begin Your Adventure
          </button>
          
          {! selectedClass && (
            <p className="text-red-400 text-sm mt-2">
              Please select a class to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}