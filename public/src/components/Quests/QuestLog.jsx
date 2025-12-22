import React, { useEffect, useState } from 'react';
import { Scroll, CheckCircle, Clock, Star } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const QuestLog = () => {
  const { activeQuests, fetchQuests, abandonQuest } = useGameStore();
  const [selectedQuest, setSelectedQuest] = useState(null);
  
  useEffect(() => {
    fetchQuests();
  }, []);
  
  const getQuestTypeColor = (type) => {
    const colors = {
      main: 'text-yellow-500',
      side: 'text-blue-500',
      daily: 'text-green-500',
      event: 'text-purple-500',
    };
    return colors[type] || 'text-gray-500';
  };
  
  const getProgressPercent = (quest) => {
    if (!quest.objectives) return 0;
    const completed = quest.objectives.filter(obj => obj.completed).length;
    return (completed / quest.objectives.length) * 100;
  };
  
  const currentQuests = activeQuests;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Scroll size={24} className="sm:w-8 sm:h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Quest Log</h1>
              <p className="text-sm sm:text-base text-gray-400">{activeQuests.length} active quests</p>
            </div>
          </div>
          

        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quest List */}
        <div className="lg:col-span-2 space-y-3">
          {currentQuests.length === 0 ? (
            <div className="card p-12 text-center">
              <Scroll size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">No active quests</p>
              <p className="text-sm text-gray-600 mt-2">Accept quests from NPCs or Quest Boards in towns</p>
            </div>
          ) : (
            currentQuests.map(quest => (
              <button
                key={quest.id}
                onClick={() => setSelectedQuest(quest)}
                className={`card p-4 w-full text-left transition-all hover:border-primary-500 ${
                  selectedQuest?.id === quest.id ? 'border-primary-500 ring-2 ring-primary-500/20' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Star size={16} className={getQuestTypeColor(quest.type)} />
                      <span className={`text-xs font-bold uppercase ${getQuestTypeColor(quest.type)}`}>
                        {quest.type}
                      </span>
                      {quest.level && (
                        <span className="text-xs text-gray-500">Level {quest.level}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{quest.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{quest.description}</p>
                  </div>
                </div>
                
                {quest.objectives && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {quest.objectives.filter(obj => obj.completed).length} / {quest.objectives.length}
                      </span>
                    </div>
                    <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-300"
                        style={{ width: `${getProgressPercent(quest)}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        
        {/* Quest Details */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            {selectedQuest ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Star size={20} className={getQuestTypeColor(selectedQuest.type)} />
                    <span className={`text-sm font-bold uppercase ${getQuestTypeColor(selectedQuest.type)}`}>
                      {selectedQuest.type}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedQuest.name}</h2>
                  <p className="text-gray-300 text-sm">{selectedQuest.description}</p>
                </div>
                
                {selectedQuest.objectives && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Objectives</h3>
                    <div className="space-y-2">
                      {selectedQuest.objectives.map((obj, index) => (
                        <div
                          key={index}
                          className={`flex items-start space-x-2 p-2 rounded ${
                            obj.completed ? 'bg-green-900/20 border border-green-700' : 'bg-dark-900'
                          }`}
                        >
                          <CheckCircle
                            size={16}
                            className={obj.completed ? 'text-green-500 mt-0.5' : 'text-gray-600 mt-0.5'}
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${obj.completed ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                              {obj.description}
                            </p>
                            {obj.progress !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                {obj.progress} / {obj.required}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedQuest.rewards && (
                  <div className="border-t border-dark-700 pt-4">
                    <h3 className="text-lg font-bold text-white mb-3">Rewards</h3>
                    <div className="space-y-2 text-sm">
                      {selectedQuest.rewards.xp && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">XP</span>
                          <span className="text-green-500">+{selectedQuest.rewards.xp}</span>
                        </div>
                      )}
                      {selectedQuest.rewards.gold && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Gold</span>
                          <span className="text-yellow-500">+{selectedQuest.rewards.gold}</span>
                        </div>
                      )}
                      {selectedQuest.rewards.items && selectedQuest.rewards.items.length > 0 && (
                        <div>
                          <p className="text-gray-400 mb-1">Items:</p>
                          <ul className="space-y-1 ml-4">
                            {selectedQuest.rewards.items.map((item, index) => (
                              <li key={index} className="text-blue-400">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 mt-4">
                  {getProgressPercent(selectedQuest) === 100 && (
                    <button className="btn-success w-full">
                      Complete Quest
                    </button>
                  )}
                  <button
                    onClick={() => {
                      abandonQuest(selectedQuest.id);
                      setSelectedQuest(null);
                    }}
                    className="btn-danger w-full"
                  >
                    Abandon Quest
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Scroll size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select a quest to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestLog;
