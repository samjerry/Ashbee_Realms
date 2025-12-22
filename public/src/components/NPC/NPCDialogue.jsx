import React, { useState, useEffect } from 'react';
import { X, Scroll, CheckCircle, Star } from 'lucide-react';
import useGameStore from '../../store/gameStore';

/**
 * NPCDialogue Component
 * Handles NPC interactions and quest acceptance from NPCs
 */
const NPCDialogue = ({ npc, onClose }) => {
  const { player, fetchQuests } = useGameStore();
  const [availableQuests, setAvailableQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDialogue, setCurrentDialogue] = useState(null);

  useEffect(() => {
    if (npc) {
      loadNPCQuests();
      setCurrentDialogue(npc.greeting || `Greetings, traveler. How may I help you?`);
    }
  }, [npc]);

  const loadNPCQuests = async () => {
    try {
      setIsLoading(true);
      const channel = player?.channel;
      const response = await fetch(`/api/quests/available?channel=${channel}&npcId=${npc.id}`);
      const data = await response.json();
      setAvailableQuests(data.quests || []);
    } catch (error) {
      console.error('Failed to load NPC quests:', error);
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
          source: 'npc',
          npcId: npc.id
        })
      });
      
      // Update quests and close dialogue
      await fetchQuests();
      setCurrentDialogue(`Quest accepted! May fortune favor you on your journey.`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to accept quest:', error);
    }
  };

  const handleDeclineQuest = () => {
    setSelectedQuest(null);
    setCurrentDialogue(npc.greeting || `Greetings, traveler. How may I help you?`);
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

  if (!npc) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="card p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="text-4xl sm:text-5xl">{npc.icon || '🧙'}</div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{npc.name}</h2>
                <p className="text-sm sm:text-base text-gray-400">{npc.title || 'Villager'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Dialogue Text */}
          <div className="bg-dark-900 rounded-lg p-4 sm:p-6 border border-dark-700">
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed">{currentDialogue}</p>
          </div>

          {/* Quest Details View */}
          {selectedQuest && (
            <div className="bg-dark-800 rounded-lg p-4 sm:p-6 border border-primary-500/50 space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star size={20} className={getQuestTypeColor(selectedQuest.type)} />
                <span className={`text-sm font-bold uppercase ${getQuestTypeColor(selectedQuest.type)}`}>
                  {selectedQuest.type || 'side'}
                </span>
                {selectedQuest.required_level && (
                  <span className="text-xs text-gray-500">Level {selectedQuest.required_level}</span>
                )}
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

              {/* Accept/Decline Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => handleAcceptQuest(selectedQuest.id)}
                  className="btn-primary flex-1"
                >
                  Accept Quest
                </button>
                <button
                  onClick={handleDeclineQuest}
                  className="btn-secondary flex-1"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Available Quests List */}
          {!selectedQuest && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <Scroll size={48} className="mx-auto mb-3 animate-pulse" />
                  <p>Loading quests...</p>
                </div>
              ) : availableQuests.length > 0 ? (
                <>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Scroll size={20} />
                    <span>Available Quests</span>
                  </h3>
                  {availableQuests.map(quest => (
                    <button
                      key={quest.id}
                      onClick={() => {
                        setSelectedQuest(quest);
                        setCurrentDialogue(quest.dialogue?.start || `I have a task that requires someone of your talents...`);
                      }}
                      className="w-full card p-4 text-left hover:border-primary-500 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Star size={16} className={getQuestTypeColor(quest.type)} />
                            <span className={`text-xs font-bold uppercase ${getQuestTypeColor(quest.type)}`}>
                              {quest.type || 'side'}
                            </span>
                            {quest.required_level && (
                              <span className="text-xs text-gray-500">Level {quest.required_level}</span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white">{quest.name}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2 mt-1">{quest.description}</p>
                        </div>
                      </div>
                      {quest.rewards && (
                        <div className="mt-3 flex items-center space-x-4 text-xs text-gray-400">
                          {quest.rewards.xp && <span className="text-green-500">{quest.rewards.xp} XP</span>}
                          {quest.rewards.gold && <span className="text-yellow-500">{quest.rewards.gold} Gold</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scroll size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No quests available from this NPC at the moment.</p>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {!selectedQuest && !isLoading && (
            <button
              onClick={onClose}
              className="btn-secondary w-full mt-4"
            >
              Farewell
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPCDialogue;
