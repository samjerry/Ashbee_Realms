import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import useGameStore from '../../store/gameStore';

/**
 * TutorialDialogue Component
 * Displays NPC dialogue for tutorial with branching conversations
 * 
 * Note: Variable replacement now happens on the BACKEND for world_name.
 * The backend /api/tutorial/dialogue/:npcId/:nodeId route processes all variables
 * before sending to the frontend. The frontend replaceVariables is now just a safety fallback.
 */
const TutorialDialogue = ({ 
  npcId, 
  dialogueNodeId, 
  character, 
  onClose, 
  onAction,
  onComplete 
}) => {
  // Get world name from game store for fallback use
  const { worldName } = useGameStore();
  
  const [currentNode, setCurrentNode] = useState(null);
  const [npcData, setNpcData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState([]);
  const [enableTypewriter, setEnableTypewriter] = useState(
    localStorage.getItem('enableTypewriter') !== 'false'
  );
  const typewriterIntervalRef = useRef(null);

  useEffect(() => {
    if (npcId && dialogueNodeId) {
      loadDialogueNode(npcId, dialogueNodeId);
      loadNPCData(npcId);
    }
  }, [npcId, dialogueNodeId]);

  us// Clear any existing typewriter interval
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    
    if (currentNode && enableTypewriter) {
      typewriterEffect(currentNode.text);
    } else if (currentNode) {
      const processedText = replaceVariables(currentNode.text);
      console.log('📖 [Frontend] Display text (no typewriter):', processedText);
      setDisplayText(processedText);
      setIsTyping(false);
    }
    
    // Cleanup function
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }ction
    return () => {
      setIsTyping(false);
    };
  }, [currentNode, enableTypewriter]);

  const loadNPCData = async (npcId) => {
    try {
      const response = await fetch(`/api/tutorial/npc/${npcId}`);
      const data = await response.json();
      if (data.success) {
        setNpcData(data.npc);
      }
    } catch (error) {
      console.error('Failed to load NPC data:', error);
    }
  };

  const loadDialogueNode = async (npcId, nodeId) => {
    setIsLoading(true);
    setError(null);
    
    console.log('📖 [TutorialDialogue] Loading dialogue node:', { npcId, nodeId });
    
    try {
      const response = await fetch(`/api/tutorial/dialogue/${npcId}/${nodeId}`);
      const data = await response.json();
      
      console.log('📖 [TutorialDialogue] Dialogue response:', { 
        success: data.success, 
        hasNode: !!data.node, 
        error: data.error 
      });
      
      if (!data.success) {
        console.error('❌ [TutorialDialogue] Dialogue loading failed:', data.error);
        throw new Error(data.error || 'Failed to load dialogue');
      }
      
      console.log('✅ [TutorialDialogue] Dialogue node loaded:', data.node.id);
      console.log('📖 [Frontend] Received text from API:', data.node.text);
      
      setCurrentNode(data.node);
      setDialogueHistory(prev => [...prev, { nodeId, text: data.node.text }]);
      
      // Process node rewards if any
      if (data.node.reward) {
        // Rewards will be granted when advancing
      }
    } catch (error) {
      console.error('❌ [TutorialDialogue] Error loading dialogue:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const replaceVariables = (text) => {
    if (!text) return text;
    
    // Backend should have already replaced all variables
    // This function is now just a safety fallback
    
    let result = text;
    
    // Only replace if variables still exist (shouldn't happen if backend works correctly)
    if (result.includes('{')) {
      console.warn('[TutorialDialogue] Variables found in dialogue text - backend should have replaced these');
      
      // Use world name from hook (already extracted at component level)
      const fallbackWorldName = worldName || 'Ashbee Realms';
      
      if (character) {
        result = result
          .replace(/\{player_name\}/g, character.name || 'traveler')
          .replace(/\{player_level\}/g, character.level || 1)
          .replace(/\{player_class\}/g, character.class || 'adventurer');
      }
      
      result = result.replace(/\{world_name\}/g, fallbackWorldName);
    }
    
    return result;
  };

  const typewriterEffect = (text) => {
    const processedText = replaceVariables(text);
    console.log('📖 [Frontend] Typewriter processed text:', processedText);
    
    // Handle empty strings
    if (!processedText) {
      setDisplayText('');
    typewriterIntervalRef.current = setInterval(() => {
      currentIndex++;
      if (currentIndex <= processedText.length) {
        setDisplayText(processedText.substring(0, currentIndex));
      } else {
        setIsTyping(false);
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
          typewriterIntervalRef.current = null;
        }
      }
    }, 20); // Typing speed: 20ms per character
      if (currentIndex <= processedText.length) {
        setDisplayText(processedText.substring(0, currentIndex));
      } else {
        setIsTyping(false);
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
        clearInterval(interval);
      }
    }, 20); // Typing speed: 20ms per character
    
    // Store interval for cleanup
    return () => clearInterval(interval);
  };

  const skipTypewriter = () => {
    if (isTyping && currentNode) {
      setDisplayText(replaceVariables(currentNode.text));
      setIsTyping(false);
    }
  };

  const handleChoice = async (choice, choiceIndex) => {
    // Trigger action if specified
    if (currentNode.action) {
      if (onAction) {
        onAction(currentNode.action, currentNode.action_target);
      }
    }

    // Check if choice has an action
    if (choice.action) {
      if (choice.action === 'open_character_creation') {
        // Special handling for character creation
        if (onAction) {
          onAction('open_character_creation', null);
        }
        onClose();
        return;
      } else if (onAction) {
        onAction(choice.action, choice.action_target);
      }
    }

    // Handle dialogue advancement
    if (choice.next === 'end') {
      // Grant any pending rewards
      if (currentNode.reward) {
        await grantRewards(currentNode.reward);
      }
      
      if (choice.action === 'complete_tutorial') {
        if (onComplete) {
          onComplete();
        }
      } else if (choice.action === 'skip_tutorial') {
        await skipTutorial();
      }
      
      onClose();
      return;
    }

    // Advance to next dialogue node
    try {
      const response = await fetch('/api/tutorial/dialogue/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId,
          currentNodeId: currentNode.id,
          choiceIndex,
          nextNodeId: choice.next
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Grant rewards from current node before moving
        if (currentNode.reward) {
          await grantRewards(currentNode.reward);
        }
        
        // Load next node
        loadDialogueNode(npcId, choice.next);
      } else {
        setError(data.error || 'Failed to advance dialogue');
      }
    } catch (error) {
      console.error('Error advancing dialogue:', error);
      setError('Failed to advance dialogue');
    }
  };

  const grantRewards = async (reward) => {
    // Rewards are handled server-side when advancing dialogue
    // Server applies rewards during dialogue advancement
    return;
  };

  const skipTutorial = async () => {
    try {
      await fetch('/api/tutorial/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  const handleKeyPress = React.useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !isTyping && currentNode?.choices?.length === 1) {
      handleChoice(currentNode.choices[0], 0);
    } else if (e.key === 'Enter' && isTyping) {
      skipTypewriter();
    }
  }, [currentNode, isTyping, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white text-xl">Loading dialogue...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-6 max-w-md">
          <h3 className="text-white font-bold mb-2">Error</h3>
          <p className="text-red-200 mb-4">{error}</p>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  if (!currentNode) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-dark-900/95 to-dark-800/95 rounded-lg border-2 border-primary-600/50 shadow-2xl overflow-hidden">
          {/* Header with NPC Info */}
          <div className="bg-gradient-to-r from-primary-600/20 to-primary-700/20 border-b border-primary-600/30 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{npcData?.icon || '🧙‍♂️'}</div>
              <div>
                <h2 className="text-2xl font-bold text-white">{npcData?.name || 'Eldrin the Guide'}</h2>
                <p className="text-sm text-gray-400">{npcData?.title || 'Veteran Adventurer'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
              title="Close (Esc)"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          {/* Dialogue Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Dialogue Text Box */}
            <div 
              className="bg-dark-900/80 border border-dark-700 rounded-lg p-6 min-h-[120px] cursor-pointer"
              onClick={skipTypewriter}
            >
              <p className="text-lg text-gray-200 leading-relaxed">
                {displayText}
                {isTyping && <span className="animate-pulse">▌</span>}
              </p>
              {isTyping && (
                <p className="text-xs text-gray-500 mt-3 text-right">
                  Click or press Enter to skip typing...
                </p>
              )}
            </div>

            {/* Choices */}
            {!isTyping && currentNode.choices && currentNode.choices.length > 0 && (
              <div className="space-y-3">
                {currentNode.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(choice, index)}
                    className="w-full text-left bg-dark-800 hover:bg-primary-900/30 border border-dark-700 hover:border-primary-600 rounded-lg p-4 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-200 group-hover:text-white">
                        {choice.text}
                      </span>
                      <ChevronRight 
                        size={20} 
                        className="text-gray-600 group-hover:text-primary-500 transition-colors" 
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Reward Preview */}
            {currentNode.reward && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400 font-semibold mb-2">Rewards:</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {currentNode.reward.xp > 0 && (
                    <span className="text-green-400">+{currentNode.reward.xp} XP</span>
                  )}
                  {currentNode.reward.gold > 0 && (
                    <span className="text-yellow-400">+{currentNode.reward.gold} Gold</span>
                  )}
                  {currentNode.reward.item && (
                    <span className="text-blue-400">Item: {currentNode.reward.item}</span>
                  )}
                  {currentNode.reward.title && (
                    <span className="text-purple-400">Title: {currentNode.reward.title}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Controls */}
          <div className="bg-dark-800/50 border-t border-dark-700 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newValue = !enableTypewriter;
                  setEnableTypewriter(newValue);
                  localStorage.setItem('enableTypewriter', newValue.toString());
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {enableTypewriter ? '⚡ Typewriter: ON' : '⚡ Typewriter: OFF'}
              </button>
            </div>
            <div>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialDialogue;
