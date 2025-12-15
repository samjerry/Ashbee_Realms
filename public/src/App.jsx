import React, { useEffect, useState } from 'react';
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
import CharacterCreation from './components/Common/CharacterCreation';

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

  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);

  useEffect(() => {
    // Check if this is a new user (tutorial=true in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isTutorial = urlParams.get('tutorial') === 'true';
    
    if (isTutorial) {
      setShowCharacterCreation(true);
      // Remove tutorial parameter from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      fetchPlayer();
    }
    
    setupSocketListeners();
  }, []);

  const handleCharacterCreation = async (characterData) => {
    setIsCreatingCharacter(true);
    
    try {
      // First, get the channel from /api/player/channel or server config
      const channelResponse = await fetch('/api/player/channel');
      const channelData = await channelResponse.json();
      const channel = channelData.channel || 'default';
      
      const response = await fetch('/api/player/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel,
          classType: characterData.class,
          nameColor: characterData.nameColor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create character');
      }

      const data = await response.json();
      console.log('Character created successfully:', data);
      
      // Hide character creation and fetch player data
      setShowCharacterCreation(false);
      await fetchPlayer();
    } catch (error) {
      console.error('Character creation failed:', error);
      alert(`Failed to create character: ${error.message}`);
    } finally {
      setIsCreatingCharacter(false);
    }
  };

  // Show character creation screen for new users
  if (showCharacterCreation) {
    return isCreatingCharacter ? <LoadingScreen /> : <CharacterCreation onComplete={handleCharacterCreation} />;
  }

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
    <div className="flex h-screen overflow-hidden bg-dark-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {renderMainContent()}
        </main>
      </div>
      
      {showDialogue && <DialogueModal />}
      {showSettings && <SettingsModal />}
    </div>
  );
}

export default App;
