import React, { useEffect } from 'react';
import useGameStore from './store/gameStore';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import CharacterSheet from './components/Character/CharacterSheet';
import Inventory from './components/Inventory/Inventory';
import CombatView from './components/Combat/CombatView';
import QuestLog from './components/Quests/QuestLog';
import MapView from './components/Map/MapView';
import DialogueModal from './components/Dialogue/DialogueModal';
import AchievementTracker from './components/Achievements/AchievementTracker';
import SettingsModal from './components/Settings/SettingsModal';
import LoadingScreen from './components/Layout/LoadingScreen';

function App() {
  const { 
    activeTab, 
    isLoading, 
    showCombat, 
    showDialogue, 
    showSettings,
    fetchPlayer,
    setupSocketListeners 
  } = useGameStore();

  useEffect(() => {
    fetchPlayer();
    setupSocketListeners();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const renderMainContent = () => {
    if (showCombat) return <CombatView />;
    
    switch (activeTab) {
      case 'character':
        return <CharacterSheet />;
      case 'inventory':
        return <Inventory />;
      case 'quests':
        return <QuestLog />;
      case 'map':
        return <MapView />;
      case 'achievements':
        return <AchievementTracker />;
      default:
        return <CharacterSheet />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
      
      {showDialogue && <DialogueModal />}
      {showSettings && <SettingsModal />}
    </div>
  );
}

export default App;
