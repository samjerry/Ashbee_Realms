import React from 'react';
import { User, Backpack, Scroll, Map, Trophy, Settings, X } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const Sidebar = () => {
  const { activeTab, setActiveTab, isMobileMenuOpen, setMobileMenuOpen, openSettings } = useGameStore();
  
  const tabs = [
    { id: 'character', icon: User, label: 'Character' },
    { id: 'inventory', icon: Backpack, label: 'Inventory' },
    { id: 'quests', icon: Scroll, label: 'Quests' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'achievements', icon: Trophy, label: 'Achievements' },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 lg:w-20 
        bg-dark-900 border-r border-dark-700 
        flex flex-col py-6 space-y-6
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Logo */}
        <div className="w-12 h-12 mx-auto lg:mx-0 lg:ml-4 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
          AR
        </div>
      
        {/* Navigation */}
        <nav className="flex-1 flex flex-col px-4 lg:px-0 lg:items-center space-y-2 lg:space-y-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            const baseClasses = [
              'relative',
              'w-full lg:w-14',
              'h-12 lg:h-14',
              'rounded-lg',
              'flex items-center lg:justify-center',
              'px-4 lg:px-0',
              'transition-all duration-200',
              'group'
            ];
            
            const stateClasses = isActive
              ? ['bg-primary-600', 'text-white', 'shadow-lg']
              : ['text-gray-400', 'hover:bg-dark-800', 'hover:text-gray-200'];
            
            const buttonClasses = [...baseClasses, ...stateClasses].join(' ');
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={buttonClasses}
                title={tab.label}
              >
                <Icon size={24} className="lg:mx-auto" />
                <span className="ml-3 lg:hidden font-medium">{tab.label}</span>
                
                {/* Desktop Tooltip */}
                <div className="hidden lg:block absolute left-full ml-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {tab.label}
                </div>
              </button>
            );
          })}
        </nav>
      
        {/* Settings button */}
        <div className="px-4 lg:px-0">
          <button
            onClick={openSettings}
            className={[
              'w-full lg:w-14',
              'h-12 lg:h-14',
              'rounded-lg',
              'flex items-center lg:justify-center',
              'px-4 lg:px-0',
              'text-gray-400',
              'hover:bg-dark-800',
              'hover:text-gray-200',
              'transition-all duration-200'
            ].join(' ')}
            title="Settings"
          >
            <Settings size={24} className="lg:mx-auto" />
            <span className="ml-3 lg:hidden font-medium">Settings</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
