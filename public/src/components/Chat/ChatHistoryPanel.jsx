import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Swords, 
  Scroll, 
  Trophy, 
  MapPin, 
  Users, 
  AlertCircle,
  X,
  Filter,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const ChatMessage = ({ message }) => {
  const getMessageIcon = () => {
    switch (message.type) {
      case 'combat':
        return <Swords className="text-red-400" size={16} />;
      case 'quest':
        return <Scroll className="text-blue-400" size={16} />;
      case 'achievement':
        return <Trophy className="text-yellow-400" size={16} />;
      case 'location':
        return <MapPin className="text-green-400" size={16} />;
      case 'party':
        return <Users className="text-purple-400" size={16} />;
      case 'system':
        return <AlertCircle className="text-gray-400" size={16} />;
      default:
        return <MessageSquare className="text-gray-400" size={16} />;
    }
  };

  const getMessageColor = () => {
    switch (message.type) {
      case 'combat':
        return 'border-red-500/30 bg-red-900/10';
      case 'quest':
        return 'border-blue-500/30 bg-blue-900/10';
      case 'achievement':
        return 'border-yellow-500/30 bg-yellow-900/10';
      case 'location':
        return 'border-green-500/30 bg-green-900/10';
      case 'party':
        return 'border-purple-500/30 bg-purple-900/10';
      case 'system':
        return 'border-gray-500/30 bg-gray-900/10';
      default:
        return 'border-dark-700 bg-dark-800/50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`flex items-start gap-2 p-2 rounded border ${getMessageColor()} transition-colors`}>
      <div className="flex-shrink-0 mt-0.5">
        {getMessageIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-white text-sm break-words">{message.text}</p>
          <span className="text-gray-500 text-xs flex-shrink-0">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        {message.details && (
          <p className="text-gray-400 text-xs mt-1">{message.details}</p>
        )}
      </div>
    </div>
  );
};

const ChatHistoryPanel = ({ messages, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const messageTypes = [
    { value: 'all', label: 'All Messages', icon: MessageSquare },
    { value: 'combat', label: 'Combat', icon: Swords },
    { value: 'quest', label: 'Quests', icon: Scroll },
    { value: 'achievement', label: 'Achievements', icon: Trophy },
    { value: 'location', label: 'Location', icon: MapPin },
    { value: 'party', label: 'Party', icon: Users },
    { value: 'system', label: 'System', icon: AlertCircle },
  ];

  const filteredMessages = filterType === 'all' 
    ? messages 
    : messages.filter(msg => msg.type === filterType);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const handleClearMessages = () => {
    if (window.confirm('Clear all chat history?')) {
      // Call parent callback to clear messages
      onClose && onClose();
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 w-96">
      <div className="bg-dark-900/95 backdrop-blur-sm rounded-lg border border-dark-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-dark-800 border-b border-dark-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-primary-500" size={20} />
              <h3 className="text-white font-bold">
                Game Events
                {filteredMessages.length > 0 && (
                  <span className="ml-2 text-sm text-gray-400">
                    ({filteredMessages.length})
                  </span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded hover:bg-dark-700 transition-colors ${
                  showFilters ? 'bg-dark-700' : ''
                }`}
                title="Filter Messages"
              >
                <Filter size={16} className="text-gray-400" />
              </button>

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded hover:bg-dark-700 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronUp size={16} className="text-gray-400" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-dark-700 transition-colors"
                title="Close"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {messageTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterType(value)}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                    transition-colors
                    ${filterType === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                    }
                  `}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Container */}
        {isExpanded && (
          <div
            ref={scrollContainerRef}
            className="h-96 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-dark-900"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare size={40} className="mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="mt-2 text-xs text-primary-500 hover:underline"
                  >
                    Show all messages
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredMessages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {isExpanded && filteredMessages.length > 0 && (
          <div className="bg-dark-800 border-t border-dark-700 p-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {filterType === 'all' ? 'All events' : `${filterType} events`}
            </span>
            <button
              onClick={handleClearMessages}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPanel;
