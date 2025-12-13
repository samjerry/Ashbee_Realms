import React, { useState, useEffect } from 'react';
import { Vote, Clock, Users, TrendingUp } from 'lucide-react';

const RaidVotingModal = ({ votingData, onVote, onClose }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const handleVote = (optionId) => {
    if (hasVoted) return;
    
    setSelectedOption(optionId);
    setHasVoted(true);
    onVote(optionId);
  };

  const getVotePercentage = (optionId) => {
    if (!votingData.results) return 0;
    const total = Object.values(votingData.results).reduce((sum, count) => sum + count, 0);
    return total > 0 ? ((votingData.results[optionId] || 0) / total * 100).toFixed(1) : 0;
  };

  const getTotalVotes = () => {
    if (!votingData.results) return 0;
    return Object.values(votingData.results).reduce((sum, count) => sum + count, 0);
  };

  const getOptionIcon = (optionId) => {
    const icons = {
      buff_boss: '👹',
      buff_players: '💪',
      spawn_adds: '👥',
      heal_all: '❤️',
      chaos_mode: '🌀'
    };
    return icons[optionId] || '🎲';
  };

  const getOptionColor = (optionId) => {
    const colors = {
      buff_boss: 'bg-red-900 border-red-600 hover:bg-red-800',
      buff_players: 'bg-blue-900 border-blue-600 hover:bg-blue-800',
      spawn_adds: 'bg-purple-900 border-purple-600 hover:bg-purple-800',
      heal_all: 'bg-green-900 border-green-600 hover:bg-green-800',
      chaos_mode: 'bg-orange-900 border-orange-600 hover:bg-orange-800'
    };
    return colors[optionId] || 'bg-gray-900 border-gray-600 hover:bg-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="card max-w-2xl w-full mx-4 p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Vote size={32} className="text-primary-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Raid Event Vote</h2>
              <p className="text-gray-400">Community decides the raid's fate!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Users size={20} />
              <span className="font-semibold">{getTotalVotes()}</span>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              timeRemaining <= 10 ? 'bg-red-900/50 text-red-400' : 'bg-dark-700 text-gray-300'
            }`}>
              <Clock size={20} />
              <span className="font-bold text-lg">{timeRemaining}s</span>
            </div>
          </div>
        </div>

        {/* Event Description */}
        <div className="mb-6 p-4 bg-dark-700 rounded-lg border border-dark-600">
          <p className="text-white font-medium mb-2">{votingData.event}</p>
          <p className="text-gray-400 text-sm">{votingData.description}</p>
        </div>

        {/* Voting Options */}
        <div className="space-y-3 mb-6">
          {votingData.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const percentage = getVotePercentage(option.id);
            const voteCount = votingData.results?.[option.id] || 0;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={hasVoted}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all relative overflow-hidden
                  ${getOptionColor(option.id)}
                  ${isSelected ? 'ring-4 ring-primary-500 scale-105' : ''}
                  ${hasVoted && !isSelected ? 'opacity-50' : ''}
                  disabled:cursor-not-allowed
                `}
              >
                {/* Vote percentage background */}
                {hasVoted && (
                  <div
                    className="absolute inset-0 bg-white/10 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getOptionIcon(option.id)}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">{option.name}</h3>
                      <p className="text-gray-300 text-sm">{option.description}</p>
                    </div>
                  </div>

                  {hasVoted && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{percentage}%</div>
                        <div className="text-gray-400 text-xs">{voteCount} votes</div>
                      </div>
                      {isSelected && (
                        <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-600">
          <p className="text-gray-400 text-sm">
            {hasVoted ? (
              <span className="text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Vote submitted! Waiting for results...
              </span>
            ) : (
              'Select an option to cast your vote'
            )}
          </p>

          <div className="flex items-center gap-2 text-yellow-400">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">Subscribers: 2x vote weight</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaidVotingModal;
