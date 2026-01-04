import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Crown, Star, X, Search, Eye, AlertTriangle, Zap, Users, Settings, Database, Trash2 } from 'lucide-react';
import { getRoleBadges, getPlayerNameColor } from '../../utils/roleHelpers';
import CharacterDeletionPanel from './CharacterDeletionPanel';

/**
 * OperatorMenu - Admin panel for moderators and streamers
 * Allows execution of operator commands to manage the game
 */
const OperatorMenu = ({ isOpen, onClose, channelName }) => {
  const [operatorStatus, setOperatorStatus] = useState(null);
  const [commands, setCommands] = useState({});
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [commandParams, setCommandParams] = useState({});
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Enhanced data states for smart selectors
  const [availableItems, setAvailableItems] = useState(null);
  const [playerInventory, setPlayerInventory] = useState(null);
  const [playerQuests, setPlayerQuests] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [locations, setLocations] = useState(null);
  const [encounters, setEncounters] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('ALL');
  const [selectedItemCategory, setSelectedItemCategory] = useState('consumables');
  const [showDeletionPanel, setShowDeletionPanel] = useState(false);

  // Command categories for better organization
  const COMMAND_CATEGORIES = {
    PLAYER: { name: 'Player Management', icon: Users, color: 'blue' },
    ECONOMY: { name: 'Economy', icon: Star, color: 'yellow' },
    WORLD: { name: 'World Control', icon: Settings, color: 'green' },
    SYSTEM: { name: 'System', icon: Database, color: 'red' }
  };

  const categorizeCommand = (cmdName, cmdData) => {
    if (['giveGold', 'removeGold', 'giveItem', 'removeItem', 'giveAllItems'].includes(cmdName)) {
      return 'ECONOMY';
    } else if (['changeWeather', 'changeTime', 'changeSeason', 'forceEvent', 'spawnEncounter'].includes(cmdName)) {
      return 'WORLD';
    } else if (['deleteCharacter', 'wipeProgress', 'grantOperator', 'revokeOperator', 'systemBroadcast', 'maintenanceMode'].includes(cmdName)) {
      return 'SYSTEM';
    } else {
      return 'PLAYER';
    }
  };

  // Helper function for rarity colors
  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-400 bg-gray-700/50 border-gray-600',
      uncommon: 'text-green-400 bg-green-900/30 border-green-700',
      rare: 'text-blue-400 bg-blue-900/30 border-blue-700',
      epic: 'text-purple-400 bg-purple-900/30 border-purple-700',
      legendary: 'text-orange-400 bg-orange-900/30 border-orange-700',
      mythic: 'text-red-400 bg-red-900/30 border-red-700'
    };
    return colors[rarity?.toLowerCase()] || colors.common;
  };

  useEffect(() => {
    if (isOpen && channelName) {
      checkOperatorStatus();
      loadPlayers();
    }
  }, [isOpen, channelName]);

  useEffect(() => {
    if (operatorStatus?.hasAccess) {
      loadCommands();
    }
  }, [operatorStatus]);

  // Load data when command or playerId changes
  useEffect(() => {
    if (!selectedCommand || !commands[selectedCommand]) return;
    
    const cmdName = selectedCommand;
    
    // Load items for giveItem command
    if (cmdName === 'giveItem') {
      loadAvailableItems();
    }
    
    // Load achievements for unlockAchievement
    if (cmdName === 'unlockAchievement') {
      loadAchievements();
    }
    
    // Load locations for teleportPlayer
    if (cmdName === 'teleportPlayer') {
      loadLocations();
    }
    
    // Load encounters for spawnEncounter
    if (cmdName === 'spawnEncounter') {
      loadEncounters();
    }
  }, [selectedCommand]);

  // Load player-specific data when playerId is set
  useEffect(() => {
    const playerId = commandParams.playerId;
    if (!playerId || !selectedCommand) return;
    
    const cmdName = selectedCommand;
    
    // Load inventory for removeItem
    if (cmdName === 'removeItem') {
      loadPlayerInventory(playerId);
    }
    
    // Load quests for resetQuest
    if (cmdName === 'resetQuest') {
      loadPlayerQuests(playerId);
    }
    
    // Load stats for commands that need current values
    if (['giveGold', 'removeGold', 'giveExp', 'setPlayerLevel'].includes(cmdName)) {
      loadPlayerStats(playerId);
    }
  }, [commandParams.playerId, selectedCommand]);

  const checkOperatorStatus = async () => {
    try {
      const response = await axios.get(`/api/operator/status?channel=${channelName}`);
      setOperatorStatus(response.data);
    } catch (error) {
      console.error('Failed to check operator status:', error);
      setOperatorStatus({ hasAccess: false });
    }
  };

  const loadCommands = async () => {
    try {
      const response = await axios.get(`/api/operator/commands?channel=${channelName}`);
      setCommands(response.data.commands);
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await axios.get(`/api/operator/players?channel=${channelName}`);
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Failed to load players:', error);
    }
  };

  // Data fetching functions for smart selectors
  const loadAvailableItems = async () => {
    if (availableItems) return; // Cache
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/items?channel=${channelName}`);
      setAvailableItems(response.data.items);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadPlayerInventory = async (playerId) => {
    if (!playerId) return;
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/player-inventory?channel=${channelName}&playerId=${playerId}`);
      setPlayerInventory(response.data);
    } catch (error) {
      console.error('Failed to load player inventory:', error);
      setPlayerInventory({ inventory: [], playerName: '' });
    } finally {
      setLoadingData(false);
    }
  };

  const loadPlayerQuests = async (playerId) => {
    if (!playerId) return;
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/player-quests?channel=${channelName}&playerId=${playerId}`);
      setPlayerQuests(response.data);
    } catch (error) {
      console.error('Failed to load player quests:', error);
      setPlayerQuests({ quests: [], playerName: '' });
    } finally {
      setLoadingData(false);
    }
  };

  const loadAchievements = async () => {
    if (achievements) return; // Cache
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/achievements?channel=${channelName}`);
      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadLocations = async () => {
    if (locations) return; // Cache
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/locations?channel=${channelName}`);
      setLocations(response.data.locations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadEncounters = async () => {
    if (encounters) return; // Cache
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/encounters?channel=${channelName}`);
      setEncounters(response.data.encounters);
    } catch (error) {
      console.error('Failed to load encounters:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadPlayerStats = async (playerId) => {
    if (!playerId) return;
    try {
      setLoadingData(true);
      const response = await axios.get(`/api/operator/data/player-stats?channel=${channelName}&playerId=${playerId}`);
      setPlayerStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load player stats:', error);
      setPlayerStats(null);
    } finally {
      setLoadingData(false);
    }
  };

  const executeCommand = async () => {
    setExecuting(true);
    setMessage(null);

    try {
      const response = await axios.post('/api/operator/execute', {
        channel: channelName,
        command: selectedCommand,
        params: commandParams
      });

      setMessage({ type: 'success', text: response.data.message });
      setSelectedCommand(null);
      setCommandParams({});
      
      // Refresh players list
      setTimeout(() => loadPlayers(), 1000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Command execution failed' 
      });
    } finally {
      setExecuting(false);
    }
  };

  const selectCommand = (cmdName) => {
    setSelectedCommand(cmdName);
    setCommandParams({});
    setMessage(null);
    // Reset player-specific data when changing commands
    setPlayerInventory(null);
    setPlayerQuests(null);
    setPlayerStats(null);
    setItemSearchTerm('');
    setSelectedRarity('ALL');
    setSelectedItemCategory('consumables');
  };

  const updateParam = (paramName, value) => {
    setCommandParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'CREATOR':
        return <Eye className="w-5 h-5 text-purple-400" />;
      case 'STREAMER':
        return <Star className="w-5 h-5 text-yellow-400" />;
      case 'MODERATOR':
        return <Shield className="w-5 h-5 text-blue-400" />;
      default:
        return null;
    }
  };

  const getLevelBadge = (level) => {
    const badges = {
      CREATOR: { icon: Eye, color: 'purple', bgColor: 'bg-purple-600', textColor: 'text-purple-300' },
      STREAMER: { icon: Star, color: 'yellow', bgColor: 'bg-yellow-600', textColor: 'text-yellow-300' },
      MODERATOR: { icon: Shield, color: 'blue', bgColor: 'bg-blue-600', textColor: 'text-blue-300' }
    };
    return badges[level] || badges.MODERATOR;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'CREATOR':
        return 'border-purple-500 bg-purple-900/20';
      case 'STREAMER':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'MODERATOR':
        return 'border-blue-500 bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-900/20';
    }
  };

  const filteredPlayers = players.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.player_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group commands by permission level
  const groupCommandsByLevel = () => {
    const grouped = {
      MODERATOR: [],
      STREAMER: [],
      CREATOR: []
    };

    Object.entries(commands).forEach(([cmdName, cmdData]) => {
      const level = cmdData.level || 'MODERATOR';
      if (grouped[level]) {
        grouped[level].push({ name: cmdName, data: cmdData });
      }
    });

    return grouped;
  };

  // Filter commands by category
  const filterCommandsByCategory = (commandsList) => {
    if (selectedCategory === 'ALL') return commandsList;
    const filtered = commandsList.filter(cmd => categorizeCommand(cmd.name, cmd.data) === selectedCategory);
    return filtered;
  };

  if (!isOpen) return null;

  if (!operatorStatus) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 text-white">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!operatorStatus.hasAccess) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 text-white max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-300">
            You do not have operator permissions for this channel.
            Only moderators, the streamer, and MarrowOfAlbion can access this menu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`border-b-2 ${getLevelColor(operatorStatus.level)} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getLevelIcon(operatorStatus.level)}
              <div>
                <h2 className="text-2xl font-bold text-white">Operator Menu</h2>
                <p className="text-sm text-gray-400">
                  {operatorStatus.username} - {operatorStatus.level} ({operatorStatus.role})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {operatorStatus.level === 'CREATOR' && (
                <button
                  onClick={() => setShowDeletionPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  title="Delete characters from any channel"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Character</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Commands List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Commands</h3>
                <div className="text-xs text-gray-400">
                  {Object.keys(commands).length} available
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-gray-800 rounded-lg p-3 mb-4">
                <div className="text-xs font-medium text-gray-400 mb-2">Filter by Category</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === 'ALL'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedCategory('PLAYER')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === 'PLAYER'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    Player Management
                  </button>
                  <button
                    onClick={() => setSelectedCategory('ECONOMY')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === 'ECONOMY'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    Economy
                  </button>
                  <button
                    onClick={() => setSelectedCategory('WORLD')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === 'WORLD'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Settings className="w-3 h-3" />
                    World Control
                  </button>
                  <button
                    onClick={() => setSelectedCategory('SYSTEM')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === 'SYSTEM'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    System
                  </button>
                </div>
              </div>

              {/* Commands by Permission Level */}
              <div className="space-y-4 max-h-[calc(90vh-300px)] overflow-y-auto pr-2">
                {Object.entries(groupCommandsByLevel()).map(([level, commandsList]) => {
                  const filteredCommands = filterCommandsByCategory(commandsList);
                  if (filteredCommands.length === 0) return null;

                  const badge = getLevelBadge(level);
                  const LevelIcon = badge.icon;

                  return (
                    <div key={level} className="space-y-2">
                      {/* Level Header */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        level === 'CREATOR' ? 'bg-purple-900/20 border-l-4 border-purple-500' :
                        level === 'STREAMER' ? 'bg-yellow-900/20 border-l-4 border-yellow-500' :
                        'bg-blue-900/20 border-l-4 border-blue-500'
                      }`}>
                        <LevelIcon className={`w-4 h-4 ${badge.textColor}`} />
                        <span className={`text-sm font-bold ${badge.textColor}`}>
                          {level} Commands
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {filteredCommands.length}
                        </span>
                      </div>

                      {/* Commands in this level */}
                      {filteredCommands.map(({ name: cmdName, data: cmdData }) => {
                        const category = COMMAND_CATEGORIES[categorizeCommand(cmdName, cmdData)];
                        const CategoryIcon = category.icon;
                        
                        return (
                          <button
                            key={cmdName}
                            onClick={() => selectCommand(cmdName)}
                            className={`w-full text-left p-3 rounded-lg transition-all group ${
                              selectedCommand === cmdName
                                ? (level === 'CREATOR' ? 'bg-purple-600 border-2 border-purple-400' :
                                   level === 'STREAMER' ? 'bg-yellow-600 border-2 border-yellow-400' :
                                   'bg-blue-600 border-2 border-blue-400') + ' shadow-lg'
                                : 'bg-gray-800 border-2 border-transparent hover:border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CategoryIcon className={`w-3.5 h-3.5 ${
                                    category.color === 'blue' ? 'text-blue-400' :
                                    category.color === 'yellow' ? 'text-yellow-400' :
                                    category.color === 'green' ? 'text-green-400' :
                                    'text-red-400'
                                  }`} />
                                  <span className={`font-medium ${
                                    selectedCommand === cmdName ? 'text-white' : 'text-gray-200'
                                  }`}>
                                    {cmdData.name}
                                  </span>
                                  {cmdData.dangerous && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                  )}
                                </div>
                                <div className={`text-xs ${
                                  selectedCommand === cmdName ? 'text-gray-300' : 'text-gray-500'
                                }`}>
                                  {cmdData.description}
                                </div>
                              </div>
                              <LevelIcon className={`w-4 h-4 ${badge.textColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Command Details & Execution */}
            <div className="lg:col-span-2">
              {selectedCommand ? (
                <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700">
                  {/* Command Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        {commands[selectedCommand].name}
                        {commands[selectedCommand].dangerous && (
                          <span className="flex items-center gap-1 text-sm font-medium text-red-400 bg-red-900/30 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-4 h-4" />
                            Dangerous
                          </span>
                        )}
                      </h3>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        getLevelBadge(commands[selectedCommand].level).bgColor
                      } bg-opacity-30`}>
                        {getLevelIcon(commands[selectedCommand].level)}
                        <span className={`text-sm font-bold ${
                          getLevelBadge(commands[selectedCommand].level).textColor
                        }`}>
                          {commands[selectedCommand].level}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400">
                      {commands[selectedCommand].description}
                    </p>
                  </div>

                  {/* Parameters */}
                  <div className="space-y-4 mb-6">
                    <div className="text-sm font-bold text-gray-300 mb-3">Parameters</div>
                    {commands[selectedCommand].params.map((param) => {
                      // Render special parameter types with smart selectors
                      const renderParamInput = () => {
                        // Player ID selector (existing)
                        if (param.name === 'playerId') {
                          return (
                            <div>
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search players..."
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <div className="max-h-48 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {filteredPlayers.length > 0 ? (
                                  filteredPlayers.map((player) => (
                                    <button
                                      key={player.player_id}
                                      onClick={() => {
                                        updateParam('playerId', player.player_id);
                                        setSearchTerm(player.name);
                                      }}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.playerId === player.player_id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="font-medium flex items-center gap-1" style={{ color: getPlayerNameColor(player.name_color, player.roles) }}>
                                        {player.roles && getRoleBadges(player.roles, player.selectedRoleBadge).map(({ Icon, color, role }) => (
                                          <Icon key={role} size={14} style={{ color }} />
                                        ))}
                                        <span>{player.name}</span>
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        Level {player.level} • {player.location}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    No players found
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Item ID selector for giveItem - browse all items
                        if (param.name === 'itemId' && selectedCommand === 'giveItem') {
                          if (!availableItems) {
                            return <div className="text-gray-400 text-sm">Loading items...</div>;
                          }

                          // Get items from selected category
                          const categoryItems = availableItems[selectedItemCategory] || {};
                          
                          // Flatten items by rarity
                          const allItems = [];
                          for (const rarity in categoryItems) {
                            const items = categoryItems[rarity];
                            if (Array.isArray(items)) {
                              items.forEach(item => allItems.push({ ...item, rarity }));
                            }
                          }

                          // Filter by search and rarity
                          const filteredItems = allItems.filter(item => {
                            const matchesSearch = !itemSearchTerm || 
                              item.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                              item.id?.toLowerCase().includes(itemSearchTerm.toLowerCase());
                            const matchesRarity = selectedRarity === 'ALL' || item.rarity === selectedRarity;
                            return matchesSearch && matchesRarity;
                          });

                          return (
                            <div>
                              {/* Category tabs */}
                              <div className="flex gap-2 mb-2 flex-wrap">
                                {['consumables', 'weapons', 'armor', 'headgear', 'accessories'].map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => setSelectedItemCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      selectedItemCategory === cat
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                  >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </button>
                                ))}
                              </div>

                              {/* Search and rarity filter */}
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={itemSearchTerm}
                                  onChange={(e) => setItemSearchTerm(e.target.value)}
                                  placeholder="Search items..."
                                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                                <select
                                  value={selectedRarity}
                                  onChange={(e) => setSelectedRarity(e.target.value)}
                                  className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                >
                                  <option value="ALL">All Rarities</option>
                                  <option value="common">Common</option>
                                  <option value="uncommon">Uncommon</option>
                                  <option value="rare">Rare</option>
                                  <option value="epic">Epic</option>
                                  <option value="legendary">Legendary</option>
                                  <option value="mythic">Mythic</option>
                                </select>
                              </div>

                              {/* Item list */}
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {filteredItems.length > 0 ? (
                                  filteredItems.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => updateParam('itemId', item.id)}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.itemId === item.id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-white">{item.name || item.id}</span>
                                        <span className={`text-xs px-2 py-1 rounded border ${getRarityColor(item.rarity)}`}>
                                          {item.rarity}
                                        </span>
                                      </div>
                                      {item.description && (
                                        <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    No items found
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {filteredItems.length} items found
                              </div>
                            </div>
                          );
                        }

                        // Item ID selector for removeItem - browse player's inventory
                        if (param.name === 'itemId' && selectedCommand === 'removeItem') {
                          if (!commandParams.playerId) {
                            return <div className="text-gray-400 text-sm">Select a player first</div>;
                          }
                          if (!playerInventory) {
                            return <div className="text-gray-400 text-sm">Loading inventory...</div>;
                          }

                          return (
                            <div>
                              <div className="text-sm text-gray-400 mb-2">
                                {playerInventory.playerName}'s Inventory
                              </div>
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {playerInventory.inventory.length > 0 ? (
                                  playerInventory.inventory.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => updateParam('itemId', item.id)}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.itemId === item.id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-medium text-white">{item.name}</span>
                                          <span className="text-gray-400 ml-2">×{item.quantity}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded border ${getRarityColor(item.rarity)}`}>
                                          {item.rarity}
                                        </span>
                                      </div>
                                      {item.description && (
                                        <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    Inventory is empty
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Quest ID selector
                        if (param.name === 'questId') {
                          if (!commandParams.playerId) {
                            return <div className="text-gray-400 text-sm">Select a player first</div>;
                          }
                          if (!playerQuests) {
                            return <div className="text-gray-400 text-sm">Loading quests...</div>;
                          }

                          return (
                            <div>
                              <div className="text-sm text-gray-400 mb-2">
                                {playerQuests.playerName}'s Quests
                              </div>
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {playerQuests.quests.length > 0 ? (
                                  playerQuests.quests.map((quest) => (
                                    <button
                                      key={quest.id}
                                      onClick={() => updateParam('questId', quest.id)}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.questId === quest.id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-white">{quest.name}</span>
                                        <div className="flex gap-2">
                                          <span className="text-xs px-2 py-1 rounded bg-blue-900/30 border border-blue-700 text-blue-400">
                                            {quest.type}
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            quest.status === 'active' 
                                              ? 'bg-green-900/30 border border-green-700 text-green-400'
                                              : 'bg-gray-700 border border-gray-600 text-gray-400'
                                          }`}>
                                            {quest.status}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    No quests available
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Achievement ID selector
                        if (param.name === 'achievementId') {
                          if (!achievements) {
                            return <div className="text-gray-400 text-sm">Loading achievements...</div>;
                          }

                          const filteredAchievements = achievements.filter(ach =>
                            !itemSearchTerm ||
                            ach.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                            ach.description?.toLowerCase().includes(itemSearchTerm.toLowerCase())
                          );

                          return (
                            <div>
                              <input
                                type="text"
                                value={itemSearchTerm}
                                onChange={(e) => setItemSearchTerm(e.target.value)}
                                placeholder="Search achievements..."
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {filteredAchievements.length > 0 ? (
                                  filteredAchievements.map((ach) => (
                                    <button
                                      key={ach.id}
                                      onClick={() => updateParam('achievementId', ach.id)}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.achievementId === ach.id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {ach.icon && <span className="text-xl">{ach.icon}</span>}
                                          <span className="font-medium text-white">{ach.name}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded border ${getRarityColor(ach.rarity)}`}>
                                          {ach.rarity}
                                        </span>
                                      </div>
                                      {ach.description && (
                                        <div className="text-xs text-gray-400 mt-1">{ach.description}</div>
                                      )}
                                      {ach.rewards && (
                                        <div className="text-xs text-blue-400 mt-1">
                                          Rewards: {
                                            Object.entries(ach.rewards).map(([key, value]) => {
                                              if (key === 'title') return `Title: ${value}`;
                                              if (key === 'gold') return `${value} Gold`;
                                              if (key === 'xp') return `${value} XP`;
                                              if (key === 'items') return `Items: ${Array.isArray(value) ? value.join(', ') : value}`;
                                              return `${key}: ${value}`;
                                            }).join(' • ')
                                          }
                                        </div>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    No achievements found
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Location selector
                        if (param.name === 'location') {
                          if (!locations) {
                            return <div className="text-gray-400 text-sm">Loading locations...</div>;
                          }

                          // Group locations by biome
                          const biomeGroups = {};
                          locations.forEach(loc => {
                            if (!biomeGroups[loc.biome]) {
                              biomeGroups[loc.biome] = [];
                            }
                            biomeGroups[loc.biome].push(loc);
                          });

                          return (
                            <div>
                              <input
                                type="text"
                                value={itemSearchTerm}
                                onChange={(e) => setItemSearchTerm(e.target.value)}
                                placeholder="Search locations..."
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {Object.entries(biomeGroups).map(([biome, locs]) => {
                                  const filteredLocs = locs.filter(loc =>
                                    !itemSearchTerm ||
                                    loc.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                                    loc.biome?.toLowerCase().includes(itemSearchTerm.toLowerCase())
                                  );

                                  if (filteredLocs.length === 0) return null;

                                  return (
                                    <div key={biome}>
                                      <div className="px-4 py-2 bg-gray-800 text-gray-300 font-medium text-sm border-b border-gray-600">
                                        {biome}
                                      </div>
                                      {filteredLocs.map((loc) => (
                                        <button
                                          key={loc.id}
                                          onClick={() => updateParam('location', loc.id)}
                                          className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                            commandParams.location === loc.id ? 'bg-blue-900/30' : ''
                                          }`}
                                        >
                                          <div className="font-medium text-white">{loc.name}</div>
                                          {loc.description && (
                                            <div className="text-xs text-gray-400 mt-1">{loc.description}</div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Encounter ID selector
                        if (param.name === 'encounterId') {
                          if (!encounters) {
                            return <div className="text-gray-400 text-sm">Loading encounters...</div>;
                          }

                          const filteredEncounters = encounters.filter(enc =>
                            !itemSearchTerm ||
                            enc.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                            enc.description?.toLowerCase().includes(itemSearchTerm.toLowerCase())
                          );

                          return (
                            <div>
                              <input
                                type="text"
                                value={itemSearchTerm}
                                onChange={(e) => setItemSearchTerm(e.target.value)}
                                placeholder="Search encounters..."
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                                {filteredEncounters.length > 0 ? (
                                  filteredEncounters.map((enc) => (
                                    <button
                                      key={enc.id}
                                      onClick={() => updateParam('encounterId', enc.id)}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                                        commandParams.encounterId === enc.id ? 'bg-blue-900/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-white">{enc.name}</span>
                                        <div className="flex gap-2">
                                          <span className="text-xs px-2 py-1 rounded bg-blue-900/30 border border-blue-700 text-blue-400">
                                            {enc.type}
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded border ${getRarityColor(enc.rarity)}`}>
                                            {enc.rarity}
                                          </span>
                                        </div>
                                      </div>
                                      {enc.description && (
                                        <div className="text-xs text-gray-400 mt-1">{enc.description}</div>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-gray-400 text-sm">
                                    No encounters found
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Default renderers for standard types
                        if (param.type === 'select') {
                          return (
                            <select
                              value={commandParams[param.name] || ''}
                              onChange={(e) => updateParam(param.name, e.target.value)}
                              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                              <option value="">Select {param.name}</option>
                              {param.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          );
                        }

                        if (param.type === 'text') {
                          return (
                            <textarea
                              value={commandParams[param.name] || ''}
                              onChange={(e) => updateParam(param.name, e.target.value)}
                              placeholder={param.placeholder || `Enter ${param.name}`}
                              rows={3}
                              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                            />
                          );
                        }

                        // Default number/text input
                        return (
                          <input
                            type={param.type === 'number' ? 'number' : 'text'}
                            value={commandParams[param.name] || ''}
                            onChange={(e) =>
                              updateParam(
                                param.name,
                                param.type === 'number'
                                  ? parseInt(e.target.value)
                                  : e.target.value
                              )
                            }
                            placeholder={param.placeholder || `Enter ${param.name}`}
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        );
                      };

                      return (
                        <div key={param.name}>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {param.name}
                            {param.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {renderParamInput()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Visual Preview Section */}
                  {playerStats && ['giveGold', 'removeGold', 'giveExp', 'setPlayerLevel'].includes(selectedCommand) && (
                    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <div className="text-sm font-bold text-blue-300 mb-2">Preview</div>
                      <div className="text-sm text-gray-300 space-y-1">
                        {selectedCommand === 'giveGold' && commandParams.amount && (
                          <>
                            <div>Current Gold: <span className="text-yellow-400">{playerStats.gold}</span></div>
                            <div>After: <span className="text-yellow-400">{playerStats.gold + (parseInt(commandParams.amount) || 0)}</span></div>
                          </>
                        )}
                        {selectedCommand === 'removeGold' && commandParams.amount && (
                          <>
                            <div>Current Gold: <span className="text-yellow-400">{playerStats.gold}</span></div>
                            <div>After: <span className="text-yellow-400">{Math.max(0, playerStats.gold - (parseInt(commandParams.amount) || 0))}</span></div>
                          </>
                        )}
                        {selectedCommand === 'giveExp' && commandParams.amount && (
                          <>
                            <div>Current: Level {playerStats.level}, {playerStats.xp}/{playerStats.xpToNext} XP</div>
                            <div className="text-green-400">+{commandParams.amount} XP</div>
                          </>
                        )}
                        {selectedCommand === 'setPlayerLevel' && commandParams.level && (
                          <>
                            <div>Current Level: <span className="text-blue-400">{playerStats.level}</span></div>
                            <div>New Level: <span className="text-blue-400">{commandParams.level}</span></div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {commandParams.itemId && commandParams.playerId && selectedCommand === 'giveItem' && (
                    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <div className="text-sm font-bold text-blue-300 mb-2">Preview</div>
                      <div className="text-sm text-gray-300">
                        Will give {commandParams.quantity || 1}× <span className="text-blue-400">{commandParams.itemId}</span> to player
                      </div>
                    </div>
                  )}

                  {commandParams.itemId && commandParams.playerId && selectedCommand === 'removeItem' && playerInventory && (
                    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <div className="text-sm font-bold text-blue-300 mb-2">Preview</div>
                      <div className="text-sm text-gray-300">
                        {(() => {
                          const item = playerInventory.inventory.find(i => i.id === commandParams.itemId);
                          const removeQty = commandParams.quantity || 1;
                          return item ? (
                            <>
                              <div>Current: {item.quantity}× {item.name}</div>
                              <div>After: {Math.max(0, item.quantity - removeQty)}× {item.name}</div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Message Display */}
                  {message && (
                    <div
                      className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
                        message.type === 'success'
                          ? 'bg-green-900/30 border border-green-700 text-green-300'
                          : 'bg-red-900/30 border border-red-700 text-red-300'
                      }`}
                    >
                      {message.type === 'success' ? (
                        <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="flex-1">{message.text}</span>
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={executeCommand}
                    disabled={executing}
                    className={`w-full py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                      executing
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : commands[selectedCommand].dangerous
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-red-900/50'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-green-900/50'
                    }`}
                  >
                    {executing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Executing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Execute Command
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-12 text-center border-2 border-dashed border-gray-700">
                  <Shield className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">Select a command from the list to begin</p>
                  <p className="text-gray-500 text-sm mt-2">Commands are organized by permission level and category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Character Deletion Panel */}
      <CharacterDeletionPanel
        isOpen={showDeletionPanel}
        onClose={() => setShowDeletionPanel(false)}
      />
    </div>
  );
};

export default OperatorMenu;
