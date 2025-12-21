import React, { useState, useEffect } from 'react';
import { User, Sword, Shield, Wand2, Heart, Zap, ArrowRight, Info } from 'lucide-react';

const CharacterCreationFlow = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [characterData, setCharacterData] = useState({
    name: '',
    class: null,
    acceptTutorial: true
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      setClasses(data.classes || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setLoading(false);
    }
  };

  const handleNameChange = (e) => {
    setCharacterData({ ...characterData, name: e.target.value });
  };

  const handleClassSelect = (classId) => {
    setCharacterData({ ...characterData, class: classId });
  };

  const handleTutorialToggle = () => {
    setCharacterData({ ...characterData, acceptTutorial: !characterData.acceptTutorial });
  };

  const handleNext = () => {
    if (step === 1 && characterData.name.length < 3) {
      alert('Character name must be at least 3 characters long');
      return;
    }
    if (step === 2 && !characterData.class) {
      alert('Please select a class');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  const handleComplete = async () => {
    try {
      const response = await fetch('/api/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterData)
      });
      const result = await response.json();
      
      if (result.success) {
        onComplete(result.character);
      } else {
        alert(result.error || 'Failed to create character');
      }
    } catch (error) {
      console.error('Character creation error:', error);
      alert('Failed to create character. Please try again.');
    }
  };

  const getClassIcon = (classId) => {
    switch (classId) {
      case 'warrior': return <Sword className="text-red-400" size={32} />;
      case 'mage': return <Wand2 className="text-blue-400" size={32} />;
      case 'rogue': return <Zap className="text-purple-400" size={32} />;
      case 'cleric': return <Heart className="text-yellow-400" size={32} />;
      case 'ranger': return <Shield className="text-green-400" size={32} />;
      default: return <User size={32} />;
    }
  };

  const selectedClass = classes.find(c => c.id === characterData.class);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
      <div className="bg-dark-900 rounded-lg border border-dark-700 max-w-4xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Character</h1>
          <p className="text-white/80">Begin your adventure in Ashbee Realms</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-dark-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {step} of 3</span>
            <span className="text-sm text-gray-400">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Name</h2>
                <p className="text-gray-400">What shall we call you, adventurer?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Character Name
                </label>
                <input
                  type="text"
                  value={characterData.name}
                  onChange={handleNameChange}
                  placeholder="Enter character name..."
                  maxLength={20}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  {characterData.name.length}/20 characters (minimum 3)
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-400 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-blue-300 font-semibold mb-1">Naming Tips</h4>
                    <ul className="text-sm text-blue-200/80 space-y-1">
                      <li>• Use letters, numbers, and underscores</li>
                      <li>• Names must be unique</li>
                      <li>• Choose wisely - names cannot be changed!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Class Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Class</h2>
                <p className="text-gray-400">Select your path and playstyle</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classOption) => (
                  <button
                    key={classOption.id}
                    onClick={() => handleClassSelect(classOption.id)}
                    className={`
                      p-6 rounded-lg border-2 transition-all text-left
                      ${characterData.class === classOption.id
                        ? 'border-primary-500 bg-primary-900/20 ring-2 ring-primary-500/50'
                        : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getClassIcon(classOption.id)}
                      <h3 className="text-xl font-bold text-white">{classOption.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{classOption.description}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Health:</span>
                        <span className="text-white font-medium">{classOption.base_stats.hp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Strength:</span>
                        <span className="text-red-400 font-medium">{classOption.base_stats.strength || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dexterity:</span>
                        <span className="text-green-400 font-medium">{classOption.base_stats.dexterity || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Constitution:</span>
                        <span className="text-blue-400 font-medium">{classOption.base_stats.constitution || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Intelligence:</span>
                        <span className="text-purple-400 font-medium">{classOption.base_stats.intelligence || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Wisdom:</span>
                        <span className="text-yellow-400 font-medium">{classOption.base_stats.wisdom || 'N/A'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedClass && (
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getClassIcon(selectedClass.id)}
                    <div>
                      <h4 className="text-green-300 font-semibold mb-1">{selectedClass.name} Selected</h4>
                      <p className="text-sm text-green-200/80">{selectedClass.lore || 'A skilled adventurer.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Tutorial */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Tutorial & Getting Started</h2>
                <p className="text-gray-400">Learn the basics or jump right in</p>
              </div>

              <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
                <h3 className="text-xl font-bold text-white mb-4">Character Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Name:</span>
                    <p className="text-white font-semibold text-lg">{characterData.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Class:</span>
                    <p className="text-white font-semibold text-lg">{selectedClass?.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-4 p-6 bg-dark-800 rounded-lg border border-dark-700 cursor-pointer hover:border-primary-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={characterData.acceptTutorial}
                    onChange={handleTutorialToggle}
                    className="mt-1 w-5 h-5 rounded bg-dark-700 border-dark-600 text-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-2">Enable Tutorial Quest</h4>
                    <p className="text-sm text-gray-400">
                      Complete a guided 10-step tutorial to learn game mechanics. Recommended for new players!
                      Earn 265 XP, 250 gold, and the "Novice Adventurer" title.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-yellow-400 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-yellow-300 font-semibold mb-1">New to Ashbee Realms?</h4>
                    <p className="text-sm text-yellow-200/80">
                      The tutorial teaches combat, exploration, quests, and progression. 
                      You can skip it if you're an experienced player. Tutorial can be replayed from settings!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-dark-800 p-6 flex items-center justify-between border-t border-dark-700">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
              >
                Back
              </button>
            )}
            {step === 1 && onSkip && (
              <button
                onClick={onSkip}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Skip Creation
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={
              (step === 1 && characterData.name.length < 3) ||
              (step === 2 && !characterData.class)
            }
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {step < 3 ? 'Next' : 'Create Character'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationFlow;
