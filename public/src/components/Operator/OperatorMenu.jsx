import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Crown, Star, X, Search, Eye, AlertTriangle, Zap, Users, Settings, Database } from 'lucide-react';
import { getRoleBadges, getPlayerNameColor } from '../../utils/roleHelpers';

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
  
  // New state for smart selectors
  const [availableItems, setAvailableItems] = useState([]);
  const [playerInventory, setPlayerInventory] = useState([]);
  const [playerQuests, setPlayerQuests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemRarityFilter, setItemRarityFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');

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

  // Load data when command is selected
  useEffect(() => {
    if (!selectedCommand) return;

    // Reset search and filters
    setItemSearch('');
    setItemRarityFilter('all');
    setItemTypeFilter('all');

    // Load data based on command type
    if (selectedCommand === 'giveItem') {
      loadAvailableItems();
    } else if (selectedCommand === 'removeItem' && commandParams.playerId) {
      loadPlayerInventory(commandParams.playerId);
    } else if (selectedCommand === 'resetQuest' && commandParams.playerId) {
      loadPlayerQuests(commandParams.playerId);
    } else if (selectedCommand === 'teleportPlayer') {
      loadLocations();
    } else if (selectedCommand === 'unlockAchievement') {
      loadAchievements();
    } else if (selectedCommand === 'spawnEncounter') {
      loadEncounters();
    }
  }, [selectedCommand, commandParams.playerId]);

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
      console.log('Loaded commands:', response.data); // Debug log
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

  const loadAvailableItems = async () => {
    try {
      const response = await axios.get(`/api/operator/data/items?channel=${channelName}`);
      setAvailableItems(response.data.items);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadPlayerInventory = async (playerId) => {
    try {
      const response = await axios.get(`/api/operator/data/player-inventory?channel=${channelName}&playerId=${playerId}`);
      setPlayerInventory(response.data.inventory);
    } catch (error) {
      console.error('Failed to load player inventory:', error);
      setPlayerInventory([]);
    }
  };

  const loadPlayerQuests = async (playerId) => {
    try {
      const response = await axios.get(`/api/operator/data/player-quests?channel=${channelName}&playerId=${playerId}`);
      setPlayerQuests(response.data.quests);
    } catch (error) {
      console.error('Failed to load player quests:', error);
      setPlayerQuests([]);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await axios.get(`/api/operator/data/locations?channel=${channelName}`);
      setLocations(response.data.locations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await axios.get(`/api/operator/data/achievements?channel=${channelName}`);
      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const loadEncounters = async () => {
    try {
      const response = await axios.get(`/api/operator/data/encounters?channel=${channelName}`);
      setEncounters(response.data.encounters);
    } catch (error) {
      console.error('Failed to load encounters:', error);
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

    console.log('Grouped commands:', grouped); // Debug log
    return grouped;
  };

  // Filter commands by category
  const filterCommandsByCategory = (commandsList) => {
    if (selectedCategory === 'ALL') return commandsList;
    const filtered = commandsList.filter(cmd => categorizeCommand(cmd.name, cmd.data) === selectedCategory);
    console.log(`Filtered ${commandsList.length} commands to ${filtered.length} for category ${selectedCategory}`); // Debug log
    return filtered;
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-orange-400';
      case 'mythic': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBgColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'bg-gray-700/50';
      case 'uncommon': return 'bg-green-900/30';
      case 'rare': return 'bg-blue-900/30';
      case 'epic': return 'bg-purple-900/30';
      case 'legendary': return 'bg-orange-900/30';
      case 'mythic': return 'bg-red-900/30';
      default: return 'bg-gray-700/50';
    }
  };

  // Render specialized parameter inputs based on command
  const renderParameterInput = (param) => {
    // Player selector (existing)
    if (param.name === 'playerId') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {param.name}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
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
                    setCurrentPlayer(player);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                >
                  <div className="font-medium flex items-center gap-1" style={{ color: getPlayerNameColor(player.name_color, player.roles) }}>
                    {player.roles && getRoleBadges(player.roles, player.selectedRoleBadge).map(({ Icon, color, role }) => (
                      <Icon key={role} size={14} style={{ color }} />
                    ))}
                    <span>{player.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Level {player.level} • {player.location} • {player.gold} gold
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

    // Item selector for giveItem command
    if (param.name === 'itemId' && selectedCommand === 'giveItem') {
      const filteredItems = availableItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase());
        const matchesRarity = itemRarityFilter === 'all' || item.rarity === itemRarityFilter;
        const matchesType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
        return matchesSearch && matchesRarity && matchesType;
      });

      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Item {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          
          {/* Search and filters */}
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex gap-2">
              <select
                value={itemRarityFilter}
                onChange={(e) => setItemRarityFilter(e.target.value)}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythic">Mythic</option>
              </select>
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
              >
                <option value="all">All Types</option>
                <option value="consumable">Consumable</option>
                <option value="main_hand">Weapon</option>
                <option value="armor">Armor</option>
                <option value="headgear">Headgear</option>
              </select>
            </div>
          </div>

          {/* Item browser */}
          <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateParam('itemId', item.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                    commandParams.itemId === item.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getRarityColor(item.rarity)}`}>
                          {item.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityBgColor(item.rarity)} ${getRarityColor(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Type: {item.type} • Value: {item.value}g</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-400 text-sm">
                No items found
              </div>
            )}
          </div>
        </div>
      );
    }

    // Item selector for removeItem command (from player inventory)
    if (param.name === 'itemId' && selectedCommand === 'removeItem') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Item from Inventory {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {commandParams.playerId ? (
            <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
              {playerInventory.length > 0 ? (
                playerInventory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateParam('itemId', item.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                      commandParams.itemId === item.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getRarityColor(item.rarity)}`}>
                            {item.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600 text-white">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-400 text-sm">
                  Player has no items in inventory
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 bg-gray-700 rounded-lg text-gray-400 text-sm border border-gray-600">
              Please select a player first
            </div>
          )}
        </div>
      );
    }

    // Quest selector for resetQuest command
    if (param.name === 'questId') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Quest {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {commandParams.playerId ? (
            <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
              {playerQuests.length > 0 ? (
                playerQuests.map((quest) => (
                  <button
                    key={quest.id}
                    onClick={() => updateParam('questId', quest.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                      commandParams.questId === quest.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{quest.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        quest.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {quest.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600 text-gray-300">
                        {quest.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{quest.description}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-400 text-sm">
                  Player has no quests
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 bg-gray-700 rounded-lg text-gray-400 text-sm border border-gray-600">
              Please select a player first
            </div>
          )}
        </div>
      );
    }

    // Location selector for teleportPlayer command
    if (param.name === 'location') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Location {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
            {locations.length > 0 ? (
              locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => updateParam('location', location.name)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                    commandParams.location === location.name ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{location.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                      Danger: {location.dangerLevel}
                    </span>
                    {location.biome && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600 text-gray-300">
                        {location.biome}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{location.description}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-400 text-sm">
                Loading locations...
              </div>
            )}
          </div>
        </div>
      );
    }

    // Achievement selector for unlockAchievement command
    if (param.name === 'achievementId') {
      const filteredAchievements = achievements.filter(ach =>
        ach.name.toLowerCase().includes(itemSearch.toLowerCase())
      );

      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Achievement {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search achievements..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
            {filteredAchievements.length > 0 ? (
              filteredAchievements.map((achievement) => (
                <button
                  key={achievement.id}
                  onClick={() => updateParam('achievementId', achievement.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                    commandParams.achievementId === achievement.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getRarityColor(achievement.rarity)}`}>
                          {achievement.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400">
                          {achievement.points} pts
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{achievement.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Category: {achievement.category}</div>
                    </div>
                  </div>
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

    // Encounter selector for spawnEncounter command
    if (param.name === 'encounterId') {
      const filteredEncounters = encounters.filter(enc =>
        enc.name.toLowerCase().includes(itemSearch.toLowerCase())
      );

      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Encounter {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search encounters..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="max-h-64 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
            {filteredEncounters.length > 0 ? (
              filteredEncounters.map((encounter) => (
                <button
                  key={encounter.id}
                  onClick={() => updateParam('encounterId', encounter.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                    commandParams.encounterId === encounter.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{encounter.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityBgColor(encounter.rarity)} ${getRarityColor(encounter.rarity)}`}>
                      {encounter.rarity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600 text-gray-300">
                      {encounter.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{encounter.description}</div>
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

    // Default rendering for other parameters
    if (param.type === 'select') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {param.name}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
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
        </div>
      );
    } else if (param.type === 'text') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {param.name}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <textarea
            value={commandParams[param.name] || ''}
            onChange={(e) => updateParam(param.name, e.target.value)}
            placeholder={param.placeholder || `Enter ${param.name}`}
            rows={3}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          />
        </div>
      );
    } else {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {param.name}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
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
        </div>
      );
    }
  };

  // Render preview panel
  const renderPreview = () => {
    if (!selectedCommand || !currentPlayer) return null;

    const cmd = commands[selectedCommand];
    if (!cmd) return null;

    let previewText = '';
    
    if (selectedCommand === 'giveItem' && commandParams.itemId && commandParams.quantity) {
      const item = availableItems.find(i => i.id === commandParams.itemId);
      if (item) {
        previewText = `Will give ${commandParams.quantity}x ${item.name} to ${currentPlayer.name}`;
      }
    } else if (selectedCommand === 'removeItem' && commandParams.itemId && commandParams.quantity) {
      const item = playerInventory.find(i => i.id === commandParams.itemId);
      if (item) {
        const remaining = item.quantity - commandParams.quantity;
        previewText = `${currentPlayer.name} has ${item.quantity}x ${item.name} → will have ${Math.max(0, remaining)} after removal`;
      }
    } else if (selectedCommand === 'giveGold' && commandParams.amount) {
      const newGold = currentPlayer.gold + parseInt(commandParams.amount);
      previewText = `${currentPlayer.name}: ${currentPlayer.gold} gold → ${newGold} gold`;
    } else if (selectedCommand === 'removeGold' && commandParams.amount) {
      const newGold = Math.max(0, currentPlayer.gold - parseInt(commandParams.amount));
      previewText = `${currentPlayer.name}: ${currentPlayer.gold} gold → ${newGold} gold`;
    } else if (selectedCommand === 'setPlayerLevel' && commandParams.level) {
      previewText = `${currentPlayer.name}: Level ${currentPlayer.level} → Level ${commandParams.level}`;
    } else if (selectedCommand === 'teleportPlayer' && commandParams.location) {
      previewText = `Will teleport ${currentPlayer.name} from '${currentPlayer.location}' to '${commandParams.location}'`;
    } else if (selectedCommand === 'resetQuest' && commandParams.questId) {
      const quest = playerQuests.find(q => q.id === commandParams.questId);
      if (quest) {
        previewText = `Will reset quest '${quest.name}' for ${currentPlayer.name}`;
      }
    } else if (selectedCommand === 'unlockAchievement' && commandParams.achievementId) {
      const achievement = achievements.find(a => a.id === commandParams.achievementId);
      if (achievement) {
        previewText = `Will unlock achievement '${achievement.name}' for ${currentPlayer.name}`;
      }
    } else if (selectedCommand === 'spawnEncounter' && commandParams.encounterId) {
      const encounter = encounters.find(e => e.id === commandParams.encounterId);
      if (encounter) {
        previewText = `Will spawn '${encounter.name}' encounter for ${currentPlayer.name}`;
      }
    }

    if (!previewText) return null;

    return (
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-start gap-2">
          <Eye className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-300 mb-1">Preview</div>
            <div className="text-sm text-blue-200">{previewText}</div>
          </div>
        </div>
      </div>
    );
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
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
                    {commands[selectedCommand].params.map((param) => renderParameterInput(param))}
                  </div>

                  {/* Preview Panel */}
                  {renderPreview()}

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
    </div>
  );
};

export default OperatorMenu;
