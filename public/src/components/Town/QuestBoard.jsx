import React, { useState, useEffect } from 'react';
import { X, Scroll, CheckCircle, Star, MapPin } from 'lucide-react';
import useGameStore from '../../store/gameStore';

/**
 * QuestBoard Component
 * Displays available quests in towns as quest board postings
 */
const QuestBoard = ({ location, onClose }) => {
  const { player, fetchQuests } = useGameStore();
  const [availableQuests, setAvailableQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, main, side, daily

  useEffect(() => {
    if (location) {
      loadQuestBoardQuests();
    }
  }, [location]);

  const loadQuestBoardQuests = async () => {
    try {
      setIsLoading(true);
      const channel = player?.channel;
      const response = await fetch(`/api/quests/available?channel=${channel}&location=${location}`);
      const data = await response.json();
      setAvailableQuests(data.quests || []);
    } catch (error) {
      console.error('Failed to load quest board quests:', error);
      setAvailableQuests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptQuest = async (questId) => {
    try {
      const channel = player?.channel;
      await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questId, 
          channel,
          source: 'quest_board',
          location: location
        })
      });
      
      // Update quests
      await fetchQuests();
      await loadQuestBoardQuests();
      setSelectedQuest(null);
    } catch (error) {
      console.error('Failed to accept quest:', error);
    }
  };

  const getQuestTypeColor = (type) => {
    const colors = {
      main: 'text-yellow-500',
      side: 'text-blue-500',
      daily: 'text-green-500',
      event: 'text-purple-500',
    };
    return colors[type] || 'text-gray-500';
  };

  const getQuestTypeBadgeColor = (type) => {
    const colors = {
      main: 'bg-yellow-500/20 border-yellow-500/50',
      side: 'bg-blue-500/20 border-blue-500/50',
      daily: 'bg-green-500/20 border-green-500/50',
      event: 'bg-purple-500/20 border-purple-500/50',
    };
    return colors[type] || 'bg-gray-500/20 border-gray-500/50';
  };

  const filteredQuests = availableQuests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'main') return quest.is_main === true;
    if (filter === 'side') return !quest.is_main && !quest.is_daily;
    if (filter === 'daily') return quest.is_daily === true;
    return true;
  });

  const canAcceptQuest = (quest) => {
    if (player && quest.required_level && player.level < quest.required_level) {
      return false;
    }
    return true;
  };

  if (!location) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="card p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Scroll size={32} className="text-primary-500" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Quest Board</h2>
                <p className="text-sm sm:text-base text-gray-400 flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{location || 'Town Center'}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {['all', 'main', 'side', 'daily'].map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterType
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType === 'all' && ` (${availableQuests.length})`}
              </button>
            ))}
          </div>

          {/* Quest Details View */}
          {selectedQuest && (
            <div className="bg-dark-800 rounded-lg p-4 sm:p-6 border border-primary-500/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star size={20} className={getQuestTypeColor(selectedQuest.type)} />
                  <span className={`text-sm font-bold uppercase ${getQuestTypeColor(selectedQuest.type)}`}>
                    {selectedQuest.type || 'side'}
                  </span>
                  {selectedQuest.required_level && (
                    <span className={`text-xs ${
                      canAcceptQuest(selectedQuest) ? 'text-gray-500' : 'text-red-500'
                    }`}>
                      Level {selectedQuest.required_level} Required
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedQuest(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-white">{selectedQuest.name}</h3>
              <p className="text-gray-300">{selectedQuest.description}</p>

              {/* Objectives Preview */}
              {selectedQuest.objectives && selectedQuest.objectives.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-2">Objectives:</h4>
                  <div className="space-y-1">
                    {selectedQuest.objectives.map((obj, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm text-gray-300">
                        <CheckCircle size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                        <span>{obj.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewards Preview */}
              {selectedQuest.rewards && (
                <div className="border-t border-dark-700 pt-3">
                  <h4 className="text-sm font-bold text-gray-400 mb-2">Rewards:</h4>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {selectedQuest.rewards.xp && (
                      <span className="text-green-500">+{selectedQuest.rewards.xp} XP</span>
                    )}
                    {selectedQuest.rewards.gold && (
                      <span className="text-yellow-500">+{selectedQuest.rewards.gold} Gold</span>
                    )}
                    {selectedQuest.rewards.items && selectedQuest.rewards.items.length > 0 && (
                      <span className="text-blue-400">{selectedQuest.rewards.items.length} Item(s)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Accept Button */}
              <button
                onClick={() => handleAcceptQuest(selectedQuest.id)}
                disabled={!canAcceptQuest(selectedQuest)}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  canAcceptQuest(selectedQuest)
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canAcceptQuest(selectedQuest) ? 'Accept Quest' : 'Level Requirement Not Met'}
              </button>
            </div>
          )}

          {/* Quest Board Postings */}
          {!selectedQuest && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <Scroll size={48} className="mx-auto mb-3 animate-pulse" />
                  <p>Loading quest board...</p>
                </div>
              ) : filteredQuests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredQuests.map(quest => {
                    const questCanAccept = canAcceptQuest(quest);
                    return (
                      <button
                        key={quest.id}
                        onClick={() => setSelectedQuest(quest)}
                        className={`card p-4 text-left hover:border-primary-500 transition-all ${
                          !questCanAccept ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Quest Posting Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`px-2 py-1 rounded border text-xs font-bold uppercase ${getQuestTypeBadgeColor(quest.type)}`}>
                            <span className={getQuestTypeColor(quest.type)}>
                              {quest.type || 'side'}
                            </span>
                          </div>
                          {quest.required_level && (
                            <span className={`text-xs ${
                              questCanAccept ? 'text-gray-500' : 'text-red-400'
                            }`}>
                              Lvl {quest.required_level}
                            </span>
                          )}
                        </div>

                        {/* Quest Title & Description */}
                        <h4 className="text-base font-bold text-white mb-2">{quest.name}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{quest.description}</p>

                        {/* Rewards */}
                        {quest.rewards && (
                          <div className="flex items-center space-x-3 text-xs pt-2 border-t border-dark-700">
                            {quest.rewards.xp && (
                              <span className="text-green-500 flex items-center space-x-1">
                                <CheckCircle size={12} />
                                <span>{quest.rewards.xp} XP</span>
                              </span>
                            )}
                            {quest.rewards.gold && (
                              <span className="text-yellow-500">{quest.rewards.gold} Gold</span>
                            )}
                            {quest.rewards.items && quest.rewards.items.length > 0 && (
                              <span className="text-blue-400">{quest.rewards.items.length} Item(s)</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Scroll size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No quests available on the board.</p>
                  <p className="text-sm mt-2">Check back later or try a different filter.</p>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {!selectedQuest && !isLoading && (
            <button
              onClick={onClose}
              className="btn-secondary w-full"
            >
              Leave Quest Board
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestBoard;
