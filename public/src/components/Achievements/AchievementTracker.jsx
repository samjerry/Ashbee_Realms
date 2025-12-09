import React, { useEffect } from 'react';
import { Trophy, Lock, CheckCircle } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const AchievementTracker = () => {
  const { achievements, fetchAchievements } = useGameStore();
  
  useEffect(() => {
    fetchAchievements();
  }, []);
  
  const getRarityColor = (rarity) => {
    const colors = {
      common: 'border-gray-500',
      uncommon: 'border-green-500',
      rare: 'border-blue-500',
      epic: 'border-purple-500',
      legendary: 'border-yellow-500',
    };
    return colors[rarity] || 'border-gray-700';
  };
  
  const categories = [...new Set(achievements.map(a => a.category))];
  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.points || 0), 0);
  const totalUnlocked = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy size={32} className="text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Achievements</h1>
              <p className="text-gray-400">{totalUnlocked} / {achievements.length} unlocked</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-400">Achievement Points</p>
            <p className="text-3xl font-bold text-yellow-500">{totalPoints}</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span>{Math.floor((totalUnlocked / achievements.length) * 100)}%</span>
          </div>
          <div className="h-4 bg-dark-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-500 transition-all duration-300"
              style={{ width: `${(totalUnlocked / achievements.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Achievements by Category */}
      {categories.map(category => {
        const categoryAchievements = achievements.filter(a => a.category === category);
        const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
        
        return (
          <div key={category} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white capitalize">{category}</h2>
              <span className="text-gray-400">{unlockedCount} / {categoryAchievements.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`bg-dark-900 rounded-lg p-4 border-2 ${
                    achievement.unlocked 
                      ? getRarityColor(achievement.rarity)
                      : 'border-dark-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{achievement.icon || '🏆'}</div>
                    {achievement.unlocked ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : achievement.hidden ? (
                      <Lock size={20} className="text-gray-600" />
                    ) : null}
                  </div>
                  
                  <h3 className={`font-bold mb-1 ${
                    achievement.unlocked 
                      ? 'text-white' 
                      : achievement.hidden 
                      ? 'text-gray-600' 
                      : 'text-gray-400'
                  }`}>
                    {achievement.hidden && !achievement.unlocked ? '???' : achievement.name}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-3">
                    {achievement.hidden && !achievement.unlocked 
                      ? 'Hidden achievement' 
                      : achievement.description}
                  </p>
                  
                  {achievement.progress !== undefined && !achievement.unlocked && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>
                          {typeof achievement.progress === 'object' 
                            ? `${achievement.progress.current || 0} / ${achievement.progress.required || achievement.required || 0}`
                            : `${achievement.progress || 0} / ${achievement.required || 0}`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-600 to-primary-500"
                          style={{ 
                            width: `${
                              typeof achievement.progress === 'object'
                                ? (achievement.progress.percentage || 0)
                                : ((achievement.progress / (achievement.required || 1)) * 100)
                            }%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-800">
                    <span className={`text-xs font-bold uppercase rarity-${achievement.rarity}`}>
                      {achievement.rarity}
                    </span>
                    <span className="text-sm text-yellow-500">{achievement.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementTracker;
