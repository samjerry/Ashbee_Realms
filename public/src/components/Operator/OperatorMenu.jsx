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

    return grouped;
  };

  // Filter commands by category
  const filterCommandsByCategory = (commandsList) => {
    if (selectedCategory === 'ALL') return commandsList;
    return commandsList.filter(cmd => categorizeCommand(cmd.name, cmd.data) === selectedCategory);
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
                  {Object.entries(COMMAND_CATEGORIES).map(([key, cat]) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                          selectedCategory === key
                            ? `bg-${cat.color}-600 text-white`
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {cat.name}
                      </button>
                    );
                  })}
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
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${badge.bgColor} bg-opacity-20 border-l-4 border-${badge.color}-500`}>
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
                                ? `${badge.bgColor} border-2 border-${badge.color}-400 shadow-lg`
                                : 'bg-gray-800 border-2 border-transparent hover:border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CategoryIcon className={`w-3.5 h-3.5 text-${category.color}-400`} />
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
                    {commands[selectedCommand].params.map((param) => (
                      <div key={param.name}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {param.name}
                          {param.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {param.type === 'select' ? (
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
                        ) : param.name === 'playerId' ? (
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
                                    className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                                  >
                                    <div className="font-medium flex items-center gap-1" style={{ color: getPlayerNameColor(player.name_color, player.roles) }}>
                                      {player.roles && getRoleBadges(player.roles, player.selected_role_badge).map(({ Icon, color, role }) => (
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
                        ) : param.type === 'text' ? (
                          <textarea
                            value={commandParams[param.name] || ''}
                            onChange={(e) => updateParam(param.name, e.target.value)}
                            placeholder={param.placeholder || `Enter ${param.name}`}
                            rows={3}
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                          />
                        ) : (
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
                        )}
                      </div>
                    ))}
                  </div>

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
