import React from 'react';
import { X } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const DialogueModal = () => {
  const { currentDialogue, makeDialogueChoice } = useGameStore();
  
  if (!currentDialogue) return null;
  
  const { npc, text, choices } = currentDialogue;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl">
        <button
          onClick={() => useGameStore.setState({ showDialogue: false, currentDialogue: null })}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <div className="card p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* NPC Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-4xl sm:text-5xl">{npc.icon || '🧙'}</div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{npc.name}</h2>
              <p className="text-sm sm:text-base text-gray-400">{npc.title}</p>
            </div>
          </div>
          
          {/* Dialogue Text */}
          <div className="bg-dark-900 rounded-lg p-4 sm:p-6 border border-dark-700">
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed">{text}</p>
          </div>
          
          {/* Choices */}
          {choices && choices.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-bold text-gray-400">Choose your response:</p>
              {choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => makeDialogueChoice(index)}
                  className="w-full bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-500 rounded-lg p-3 sm:p-4 text-left transition-all group min-h-[44px]"
                >
                  <p className="text-sm sm:text-base text-white group-hover:text-primary-400 transition-colors">
                    {choice.text}
                  </p>
                  {choice.requirement && (
                    <p className="text-xs text-gray-500 mt-1">
                      {choice.requirement}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialogueModal;
