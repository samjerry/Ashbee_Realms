import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Trophy, Swords, Scroll } from 'lucide-react';

const ToastNotification = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Match animation duration
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={24} />;
      case 'achievement':
        return <Trophy className="text-yellow-500" size={24} />;
      case 'combat':
        return <Swords className="text-red-400" size={24} />;
      case 'quest':
        return <Scroll className="text-blue-400" size={24} />;
      default:
        return <Info className="text-blue-500" size={24} />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-900/90 border-green-600';
      case 'error':
        return 'bg-red-900/90 border-red-600';
      case 'achievement':
        return 'bg-yellow-900/90 border-yellow-600';
      case 'combat':
        return 'bg-red-900/90 border-red-500';
      case 'quest':
        return 'bg-blue-900/90 border-blue-600';
      default:
        return 'bg-dark-800/90 border-primary-600';
    }
  };

  return (
    <div
      className={`
        ${getBackgroundColor()}
        border-2 rounded-lg p-4 shadow-2xl backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        min-w-[320px] max-w-[400px]
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-white font-semibold mb-1">{toast.title}</h4>
          )}
          <p className="text-gray-200 text-sm">{toast.message}</p>
          
          {toast.data && (
            <div className="mt-2 text-xs text-gray-300">
              {toast.data.xp && <p>+{toast.data.xp} XP</p>}
              {toast.data.gold && <p>+{toast.data.gold} Gold</p>}
              {toast.data.items && (
                <p>{toast.data.items.length} items received</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
};

export { ToastNotification, ToastContainer };
export default ToastContainer;
