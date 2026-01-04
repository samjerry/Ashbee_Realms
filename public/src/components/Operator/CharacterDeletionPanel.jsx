import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, AlertTriangle, Users, ChevronRight, X } from 'lucide-react';

/**
 * CharacterDeletionPanel - Multi-step character deletion interface for creators
 * Step 1: Select channel
 * Step 2: Select character from that channel
 * Step 3: Confirm deletion
 */
const CharacterDeletionPanel = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: channel, 2: character, 3: confirm
  const [channels, setChannels] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load channels on mount
  useEffect(() => {
    if (isOpen) {
      loadChannels();
    } else {
      // Reset state when closed
      setStep(1);
      setSelectedChannel(null);
      setSelectedCharacter(null);
      setError(null);
      setSuccess(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/operator/channels');
      setChannels(response.data.channels || []);
    } catch (err) {
      console.error('Error loading channels:', err);
      setError(err.response?.data?.error || 'Failed to load channels. You need Creator permissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async (channelName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/operator/channel-characters', {
        params: { channel: channelName }
      });
      setCharacters(response.data.characters || []);
      setSelectedChannel(channelName);
      setStep(2);
    } catch (err) {
      console.error('Error loading characters:', err);
      setError(err.response?.data?.error || 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const selectCharacter = (character) => {
    setSelectedCharacter(character);
    setStep(3);
  };

  const goBack = () => {
    if (step === 3) {
      setStep(2);
      setSelectedCharacter(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedChannel(null);
      setCharacters([]);
      setSearchTerm('');
    }
  };

  const deleteCharacter = async () => {
    if (!selectedCharacter || !selectedChannel) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await axios.delete('/api/operator/delete-character', {
        data: {
          channel: selectedChannel,
          playerId: selectedCharacter.playerId,
          characterName: selectedCharacter.name
        }
      });

      setSuccess(`Successfully deleted ${selectedCharacter.name} from ${selectedChannel}`);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setStep(1);
        setSelectedChannel(null);
        setSelectedCharacter(null);
        setCharacters([]);
        setSuccess(null);
        loadChannels(); // Refresh channel list
      }, 2000);
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err.response?.data?.error || 'Failed to delete character');
    } finally {
      setDeleting(false);
    }
  };

  // Filter characters by search term
  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    char.playerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg border border-red-500/50 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-dark-900 p-4 border-b border-red-500/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Delete Character</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-dark-900/50 p-3 border-b border-dark-700 flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 1 ? 'border-red-400 bg-red-900/30' : 'border-gray-600'}`}>
              1
            </div>
            <span className="text-sm font-medium">Select Channel</span>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-600" />
          
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-red-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 2 ? 'border-red-400 bg-red-900/30' : 'border-gray-600'}`}>
              2
            </div>
            <span className="text-sm font-medium">Select Character</span>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-600" />
          
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-red-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= 3 ? 'border-red-400 bg-red-900/30' : 'border-gray-600'}`}>
              3
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded text-green-400">
              {success}
            </div>
          )}

          {/* Step 1: Channel Selection */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                Select a channel to view its characters:
              </p>
              
              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading channels...
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No channels found with characters
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map(channel => (
                    <button
                      key={channel.name}
                      onClick={() => loadCharacters(channel.name)}
                      className="w-full p-4 bg-dark-900 hover:bg-dark-700 border border-dark-700 hover:border-red-500/50 rounded transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-red-400" />
                          <div>
                            <div className="font-medium text-white group-hover:text-red-400 transition-colors">
                              {channel.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {channel.characterCount} character{channel.characterCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-red-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Character Selection */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Characters in {selectedChannel}</h3>
                  <p className="text-sm text-gray-500">{filteredCharacters.length} character{filteredCharacters.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name or player ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
              />

              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading characters...
                </div>
              ) : filteredCharacters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No matching characters found' : 'No characters in this channel'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCharacters.map(character => (
                    <button
                      key={character.playerId}
                      onClick={() => selectCharacter(character)}
                      className="w-full p-4 bg-dark-900 hover:bg-dark-700 border border-dark-700 hover:border-red-500/50 rounded transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-white group-hover:text-red-400 transition-colors">
                            {character.name}
                          </div>
                          <div className="text-sm text-gray-500 space-y-0.5">
                            <div>Level {character.level} • {character.location}</div>
                            <div className="text-xs font-mono">{character.playerId}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-red-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && selectedCharacter && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Warning: Permanent Deletion</h3>
                    <p className="text-gray-300">
                      This action <strong className="text-red-400">cannot be undone</strong>. The character and all associated data will be permanently deleted.
                    </p>
                  </div>
                </div>

                <div className="bg-dark-900/50 rounded p-4 space-y-2">
                  <div className="text-sm text-gray-400">You are about to delete:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Character:</span>
                      <span className="text-white font-medium">{selectedCharacter.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Level:</span>
                      <span className="text-white">{selectedCharacter.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gold:</span>
                      <span className="text-yellow-400">{selectedCharacter.gold}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white">{selectedCharacter.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Channel:</span>
                      <span className="text-white">{selectedChannel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Player ID:</span>
                      <span className="text-white font-mono text-xs">{selectedCharacter.playerId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-dark-900/50 p-4 border-t border-dark-700 flex justify-between">
          <button
            onClick={step === 1 ? onClose : goBack}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
            disabled={deleting}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 3 && (
            <button
              onClick={deleteCharacter}
              disabled={deleting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Character
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterDeletionPanel;
