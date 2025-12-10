/**
 * GameTips.jsx
 * Rotating gameplay tips component for loading screens and help
 */

import React, { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

export default function GameTips({ show = true, position = 'bottom', autoRotate = true }) {
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(show);

  const tips = [
    "💡 Check your Quest Log regularly to track objectives and find new quests.",
    "⚔️ Equip better gear to increase your stats and survive tougher fights.",
    "🗺️ Each biome has a danger level - explore areas matching your character level.",
    "🎯 Complete achievements to earn titles, rewards, and permanent bonuses.",
    "💰 Sell unwanted items to merchants for gold, or use them for crafting.",
    "🛡️ Defense reduces incoming damage - don't neglect your armor!",
    "✨ Status effects can turn the tide of battle - use buffs and debuffs wisely.",
    "🏃 Agility determines turn order in combat - strike first to gain an advantage.",
    "📦 Inventory has limited space - manage it by stacking items or selling extras.",
    "🔮 Magic items have better stats than common gear - keep an eye out for drops!",
    "⚡ Some skills have cooldowns - use them strategically in tough fights.",
    "🌙 Moon phases affect certain creatures - werewolves are stronger during full moons!",
    "🌡️ Weather and seasons impact monster spawns and stats.",
    "🎪 Merchants have different inventories - shop around for the best deals.",
    "🏆 Join raids with other players to defeat powerful bosses and earn epic loot.",
    "📈 Passive progression persists after death - invest in permanent upgrades.",
    "🔥 Critical hits deal extra damage - rogues have the highest crit chance!",
    "💊 Stock up on health potions before challenging dungeons.",
    "🗝️ Some quests unlock new areas, factions, and storylines.",
    "⚔️ Class matters! Warriors tank, mages nuke, rogues crit, clerics heal, rangers adapt.",
    "🌟 XP gain increases with monster level - challenge yourself for faster leveling!",
    "🎲 Loot drop rates vary by rarity: Common > Uncommon > Rare > Epic > Legendary > Mythic",
    "🏰 Dungeons have multiple floors and special mechanics - read the descriptions!",
    "🤝 Faction reputation unlocks special merchants, abilities, and gear.",
    "🔧 Enchant and craft items to create powerful custom equipment.",
    "📊 Check leaderboards to see how you rank against other players.",
    "🎁 Daily quests reset every day - complete them for bonus rewards.",
    "💀 Hardcore mode deletes your character on death - only for the brave!",
    "🌍 Travel between biomes takes time - plan your journeys wisely.",
    "👥 NPCs have unique dialogue and quests - talk to everyone you meet!"
  ];

  useEffect(() => {
    if (autoRotate && isVisible) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
      }, 10000); // Rotate every 10 seconds

      return () => clearInterval(interval);
    }
  }, [autoRotate, isVisible, tips.length]);

  if (!isVisible) return null;

  const positionClasses = {
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 max-w-xl w-full px-4`}>
      <div className="bg-gray-800 border border-yellow-500 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lightbulb size={24} className="text-yellow-400" />
        </div>
        
        <div className="flex-1">
          <p className="text-white text-sm leading-relaxed">
            {tips[currentTip]}
          </p>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          title="Close tip"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Dots */}
      {autoRotate && (
        <div className="flex justify-center gap-1 mt-2">
          {tips.slice(0, 10).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTip(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentTip % 10 === index
                  ? 'bg-yellow-400 w-4'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={`Tip ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Loading screen tips variant
export function LoadingTips() {
  const [currentTip, setCurrentTip] = useState(0);

  const loadingTips = [
    "Preparing your adventure...",
    "Loading monsters and loot...",
    "Consulting the ancient tomes...",
    "Sharpening your weapons...",
    "Brewing health potions...",
    "Summoning NPCs...",
    "Opening the realm gates...",
    "Calibrating the magic systems...",
    "Awakening the guardians...",
    "Setting up your quest log..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % loadingTips.length);
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-3 bg-gray-800 px-6 py-3 rounded-lg border border-blue-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <p className="text-blue-400 font-medium">{loadingTips[currentTip]}</p>
      </div>
    </div>
  );
}
