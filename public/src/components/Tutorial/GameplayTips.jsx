import React, { useState, useEffect } from 'react';
import { Lightbulb, X, RefreshCw, Filter } from 'lucide-react';

const GameplayTipsPanel = ({ context = 'general', autoRotate = true }) => {
  const [currentTip, setCurrentTip] = useState(null);
  const [allTips, setAllTips] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedContext, setSelectedContext] = useState(context);

  useEffect(() => {
    fetchTips();
  }, [selectedContext]);

  useEffect(() => {
    if (autoRotate && allTips.length > 0) {
      const interval = setInterval(() => {
        showRandomTip();
      }, 30000); // Rotate every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRotate, allTips]);

  const fetchTips = async () => {
    try {
      const response = await fetch(`/api/tutorial/tips?context=${selectedContext}`);
      const data = await response.json();
      if (data.success) {
        setAllTips(data.tips);
        if (data.tips.length > 0) {
          setCurrentTip(data.tips[Math.floor(Math.random() * data.tips.length)]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tips:', error);
    }
  };

  const showRandomTip = () => {
    if (allTips.length > 0) {
      const randomIndex = Math.floor(Math.random() * allTips.length);
      setCurrentTip(allTips[randomIndex]);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Save preference
    localStorage.setItem('tipsVisible', 'false');
  };

  const handleNextTip = () => {
    showRandomTip();
  };

  if (!isVisible || !currentTip) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-3 bg-yellow-600 text-white rounded-full shadow-lg hover:bg-yellow-700 transition-colors z-40"
        title="Show gameplay tips"
      >
        <Lightbulb size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 animate-slide-up">
      <div className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 backdrop-blur-sm rounded-lg border border-yellow-600/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-600/20 px-4 py-3 flex items-center justify-between border-b border-yellow-600/30">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-yellow-400" size={20} />
            <h3 className="text-white font-semibold">Gameplay Tip</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNextTip}
              className="p-1 hover:bg-yellow-600/30 rounded transition-colors"
              title="Next tip"
            >
              <RefreshCw className="text-yellow-300" size={16} />
            </button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-yellow-600/30 rounded transition-colors"
              title="Close"
            >
              <X className="text-yellow-300" size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h4 className="text-yellow-200 font-semibold mb-2">{currentTip.title}</h4>
          <p className="text-yellow-100/90 text-sm leading-relaxed">
            {currentTip.description}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-yellow-600/10 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-yellow-400/70 capitalize">{currentTip.context}</span>
          <span className="text-yellow-400/70">
            {allTips.findIndex(t => t.id === currentTip.id) + 1} / {allTips.length}
          </span>
        </div>
      </div>
    </div>
  );
};

const TutorialProgress = ({ character }) => {
  const [progress, setProgress] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    if (character) {
      fetchProgress();
    }
  }, [character]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/tutorial/progress');
      const data = await response.json();
      if (data.success) {
        setProgress(data.progress);
        setCurrentStep(data.currentStep);
      }
    } catch (error) {
      console.error('Failed to fetch tutorial progress:', error);
    }
  };

  if (!progress || !progress.isActive) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-96 animate-slide-down">
      <div className="bg-dark-900/95 backdrop-blur-sm rounded-lg border border-primary-600 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3">
          <h3 className="text-white font-semibold">Tutorial Quest</h3>
          <p className="text-white/80 text-xs">
            Step {progress.currentStepIndex + 1} of {progress.totalSteps}
          </p>
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="p-4">
            <h4 className="text-white font-semibold mb-2">{currentStep.title}</h4>
            <p className="text-gray-300 text-sm mb-3">{currentStep.instruction}</p>
            
            {/* Rewards Preview */}
            <div className="bg-dark-800 rounded p-2 text-xs">
              <span className="text-gray-400">Reward: </span>
              <span className="text-yellow-400">
                {currentStep.reward.xp} XP
              </span>
              {currentStep.reward.gold > 0 && (
                <span className="text-yellow-400 ml-2">
                  {currentStep.reward.gold} Gold
                </span>
              )}
            </div>

            {/* Tip */}
            {currentStep.tip && (
              <div className="mt-3 bg-blue-900/20 border border-blue-600/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-blue-200 text-xs">{currentStep.tip}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-dark-800 px-4 py-2">
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { GameplayTipsPanel, TutorialProgress };
export default GameplayTipsPanel;
