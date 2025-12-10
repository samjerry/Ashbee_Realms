import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Crown, Star, X, Search } from 'lucide-react';

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
        return <Crown className="w-5 h-5 text-purple-400" />;
      case 'STREAMER':
        return <Star className="w-5 h-5 text-yellow-400" />;
      case 'MODERATOR':
        return <Shield className="w-5 h-5 text-blue-400" />;
      default:
        return null;
    }
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

  /**
   * Get color for player name based on their Twitch role
   * @param {string} role - User's role (viewer, vip, moderator, streamer)
   * @param {string} playerName - Player's name to check if they're the creator
   * @returns {string} Tailwind CSS color class
   */
  const getPlayerNameColor = (role, playerName) => {
    // Check if player is the game creator
    if (playerName?.toLowerCase() === 'marrowofalibion') {
      return 'text-red-900'; // Maroon for game creator
    }
    
    switch (role?.toLowerCase()) {
      case 'streamer':
        return 'text-purple-400'; // Twitch purple for streamer
      case 'moderator':
        return 'text-green-400'; // Green for moderators
      case 'vip':
        return 'text-pink-400'; // Pink for VIPs
      case 'viewer':
      default:
        return 'text-white'; // White for viewers
    }
  };

  const filteredPlayers = players.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.player_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="lg:col-span-1">
              <h3 className="text-lg font-bold text-white mb-3">Available Commands</h3>
              <div className="space-y-2">
                {Object.entries(commands).map(([cmdName, cmdData]) => (
                  <button
                    key={cmdName}
                    onClick={() => selectCommand(cmdName)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCommand === cmdName
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium">{cmdData.name}</div>
                    <div className="text-xs opacity-75">{cmdData.level}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Command Details & Execution */}
            <div className="lg:col-span-2">
              {selectedCommand ? (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {commands[selectedCommand].name}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {commands[selectedCommand].description}
                  </p>

                  {/* Parameters */}
                  <div className="space-y-3 mb-4">
                    {commands[selectedCommand].params.map((param) => (
                      <div key={param.name}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {param.name}
                          {param.required && <span className="text-red-400">*</span>}
                        </label>
                        {param.type === 'select' ? (
                          <select
                            value={commandParams[param.name] || ''}
                            onChange={(e) => updateParam(param.name, e.target.value)}
                            className="w-full bg-gray-700 text-white rounded px-3 py-2"
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
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2"
                            />
                            <div className="max-h-40 overflow-y-auto bg-gray-700 rounded">
                              {filteredPlayers.map((player) => (
                                <button
                                  key={player.player_id}
                                  onClick={() => {
                                    updateParam('playerId', player.player_id);
                                    setSearchTerm(player.name);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-600"
                                >
                                  <div className={`font-medium ${getPlayerNameColor(player.role, player.name)}`}>
                                    {player.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Level {player.level} - {player.location}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
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
                            placeholder={`Enter ${param.name}`}
                            className="w-full bg-gray-700 text-white rounded px-3 py-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Message Display */}
                  {message && (
                    <div
                      className={`p-3 rounded mb-4 ${
                        message.type === 'success'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={executeCommand}
                    disabled={executing}
                    className={`w-full py-3 rounded-lg font-bold transition-colors ${
                      executing
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {executing ? 'Executing...' : 'Execute Command'}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a command from the list to begin</p>
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
