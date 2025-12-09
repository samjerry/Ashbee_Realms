import React from 'react';
import { X } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const DialogueModal = () => {
  const { currentDialogue, makeDialogueChoice } = useGameStore();
  
  if (!currentDialogue) return null;
  
  const { npc, text, choices } = currentDialogue;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <button
          onClick={() => useGameStore.setState({ showDialogue: false, currentDialogue: null })}
          className="absolute top-6 right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="card p-8 space-y-6">
          {/* NPC Info */}
          <div className="flex items-center space-x-4">
            <div className="text-5xl">{npc.icon || '🧙'}</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{npc.name}</h2>
              <p className="text-gray-400">{npc.title}</p>
            </div>
          </div>
          
          {/* Dialogue Text */}
          <div className="bg-dark-900 rounded-lg p-6 border border-dark-700">
            <p className="text-lg text-gray-200 leading-relaxed">{text}</p>
          </div>
          
          {/* Choices */}
          {choices && choices.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-400">Choose your response:</p>
              {choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => makeDialogueChoice(index)}
                  className="w-full bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-500 rounded-lg p-4 text-left transition-all group"
                >
                  <p className="text-white group-hover:text-primary-400 transition-colors">
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
