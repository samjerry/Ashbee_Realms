/**
 * TutorialOverlay.jsx
 * Interactive tutorial overlay for guiding new players
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function TutorialOverlay({ quest, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Tutorial steps for "The Awakening" quest
  const tutorialSteps = [
    {
      title: "Welcome to Ashbee Realms!",
      description: "This tutorial will teach you the basics of the game. You can skip it at any time, but we recommend completing it to understand all features.",
      highlight: null,
      action: "Click Next to continue"
    },
    {
      title: "Character Stats",
      description: "Your character has stats like Attack, Defense, Magic, and Agility. These determine your effectiveness in combat. Check your stats in the top header bar.",
      highlight: "header",
      action: "View your HP and stats above"
    },
    {
      title: "Quest System",
      description: "You've accepted 'The Awakening' - your first quest! Quests give you objectives to complete. Check the Quest Log (sidebar) to track your progress.",
      highlight: "questlog",
      action: "Open Quest Log to see objectives"
    },
    {
      title: "Exploration",
      description: "To complete quests, you'll need to explore different locations. Use the Map (sidebar) to travel to the Whispering Woods.",
      highlight: "map",
      action: "Open Map to see available locations"
    },
    {
      title: "Combat Basics",
      description: "You'll encounter monsters during exploration. In combat, you can Attack, use Skills, or use Items. Defeating monsters gives XP and loot!",
      highlight: "combat",
      action: "Be ready to fight Forest Wolves"
    },
    {
      title: "Inventory & Equipment",
      description: "Items you collect go to your Inventory. Equip weapons and armor to increase your stats. Better gear = easier fights!",
      highlight: "inventory",
      action: "Check your starting equipment"
    },
    {
      title: "Ready to Begin!",
      description: "You now know the basics! Complete 'The Awakening' quest to unlock more features. Good luck, adventurer!",
      highlight: null,
      action: "Click Finish to start your journey"
    }
  ];

  const currentTutorial = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) onSkip();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-6 border-2 border-blue-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-blue-400">
            {currentTutorial.title}
          </h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors"
            title="Skip Tutorial"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Tutorial Progress</span>
            <span>{currentStep + 1} / {tutorialSteps.length}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300 text-lg mb-4">
            {currentTutorial.description}
          </p>
          
          {currentTutorial.highlight && (
            <div className="bg-gray-700 rounded-lg p-4 border border-yellow-500">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-semibold">Action Required:</span>
              </div>
              <p className="text-gray-300">{currentTutorial.action}</p>
            </div>
          )}

          {!currentTutorial.highlight && (
            <div className="bg-gray-700 rounded-lg p-4 border border-blue-500">
              <p className="text-blue-400">{currentTutorial.action}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Skip Tutorial
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-semibold"
          >
            {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Finish'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
