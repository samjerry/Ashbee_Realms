import React, { useEffect, useState } from 'react';
import useGameStore from './store/gameStore';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import CharacterSheet from './components/Character/CharacterSheet';
import AbilitiesMenu from './components/Character/AbilitiesMenu';
import Inventory from './components/Inventory/Inventory';
import CombatView from './components/Combat/CombatView';
import QuestLog from './components/Quests/QuestLog';
import MapView from './components/Map/MapView';
import DialogueModal from './components/Dialogue/DialogueModal';
import AchievementTracker from './components/Achievements/AchievementTracker';
import BestiaryView from './components/Bestiary/BestiaryView';
import SettingsModal from './components/Settings/SettingsModal';
import LoadingScreen from './components/Layout/LoadingScreen';
import CharacterCreation from './components/Common/CharacterCreation';
import BroadcasterSetup from './components/Broadcaster/BroadcasterSetup';

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
  const [showSetup, setShowSetup] = useState(false);

  // Apply theme helper function
  const applyTheme = (themeId) => {
    const THEMES = {
      'crimson-knight': { 
        colors: {
          50: '254 242 242', 100: '254 226 226', 200: '254 202 202', 300: '252 165 165',
          400: '248 113 113', 500: '239 68 68', 600: '220 38 38', 700: '185 28 28',
          800: '153 27 27', 900: '127 29 29'
        },
        bg: '10 10 15'
      },
      'lovecraftian': { 
        colors: {
          50: '240 253 244', 100: '220 252 231', 200: '187 247 208', 300: '134 239 172',
          400: '74 222 128', 500: '34 197 94', 600: '21 128 61', 700: '20 83 45',
          800: '22 101 52', 900: '20 83 45'
        },
        bg: '2 6 23'
      },
      'azure-mage': { 
        colors: {
          50: '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253',
          400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 700: '29 78 216',
          800: '30 64 175', 900: '30 58 138'
        },
        bg: '15 23 42'
      },
      'golden-paladin': { 
        colors: {
          50: '254 252 232', 100: '254 249 195', 200: '254 240 138', 300: '253 224 71',
          400: '250 204 21', 500: '234 179 8', 600: '202 138 4', 700: '161 98 7',
          800: '133 77 14', 900: '113 63 18'
        },
        bg: '24 24 27'
      },
      'shadow-assassin': { 
        colors: {
          50: '250 245 255', 100: '243 232 255', 200: '233 213 255', 300: '216 180 254',
          400: '192 132 252', 500: '168 85 247', 600: '124 58 237', 700: '109 40 217',
          800: '91 33 182', 900: '76 29 149'
        },
        bg: '12 10 9'
      },
      'frost-warden': { 
        colors: {
          50: '240 249 255', 100: '224 242 254', 200: '186 230 253', 300: '125 211 252',
          400: '56 189 248', 500: '14 165 233', 600: '8 145 178', 700: '14 116 144',
          800: '21 94 117', 900: '22 78 99'
        },
        bg: '10 10 15'
      }
    };
    
    const theme = THEMES[themeId] || THEMES['crimson-knight'];
    Object.entries(theme.colors).forEach(([shade, rgb]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, rgb);
    });
    document.documentElement.style.setProperty('--color-bg-950', theme.bg);
  };

  useEffect(() => {
    // Load theme from database
    fetch('/api/player')
      .then(res => res.json())
      .then(data => {
        if (data && data.theme) {
          applyTheme(data.theme);
        }
      })
      .catch(err => console.error('Failed to load theme:', err));
  }, []);

  useEffect(() => {
    // Check if this is the setup page
    if (window.location.pathname === '/setup') {
      setShowSetup(true);
      return;
    }

    // Check if this is a new user (tutorial=true in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isTutorial = urlParams.get('tutorial') === 'true';
    
    if (isTutorial) {
      setShowCharacterCreation(true);
      // Remove tutorial parameter from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      // Initialize game by fetching player data first, then setting up sockets
      const initializeGame = async () => {
        const success = await fetchPlayer();
        if (success) {
          setupSocketListeners();
        } else {
          console.error('[App] Failed to fetch player data. WebSocket setup skipped.');
        }
      };
      initializeGame();
    }
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

  // Show broadcaster setup screen if on /setup route
  if (showSetup) {
    return <BroadcasterSetup />;
  }

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
      case 'abilities':
        return <AbilitiesMenu />;
      case 'inventory':
        return <Inventory />;
      case 'quests':
        return <QuestLog />;
      case 'map':
        return <MapView />;
      case 'achievements':
        return <AchievementTracker />;
      case 'bestiary':
        return <BestiaryView />;
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
