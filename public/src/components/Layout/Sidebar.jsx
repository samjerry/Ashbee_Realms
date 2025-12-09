import React from 'react';
import { User, Backpack, Scroll, Map, Trophy, Settings } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const Sidebar = () => {
  const { activeTab, setActiveTab, player } = useGameStore();
  
  const tabs = [
    { id: 'character', icon: User, label: 'Character' },
    { id: 'inventory', icon: Backpack, label: 'Inventory' },
    { id: 'quests', icon: Scroll, label: 'Quests' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'achievements', icon: Trophy, label: 'Achievements' },
  ];

  return (
    <div className="w-20 bg-dark-900 border-r border-dark-700 flex flex-col items-center py-6 space-y-6">
      {/* Logo */}
      <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
        AR
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative w-14 h-14 rounded-lg flex flex-col items-center justify-center transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:bg-dark-800 hover:text-gray-200'
              }`}
              title={tab.label}
            >
              <Icon size={24} />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {tab.label}
              </div>
            </button>
          );
        })}
      </nav>
      
      {/* Settings button */}
      <button
        onClick={() => useGameStore.setState({ showSettings: true })}
        className="w-14 h-14 rounded-lg flex items-center justify-center text-gray-400 hover:bg-dark-800 hover:text-gray-200 transition-all duration-200"
        title="Settings"
      >
        <Settings size={24} />
      </button>
    </div>
  );
};

export default Sidebar;
