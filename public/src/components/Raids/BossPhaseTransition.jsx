import React, { useState, useEffect } from 'react';
import { Skull, Crown, Flame } from 'lucide-react';

const BossPhaseTransition = ({ phaseData, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete && onComplete(), 300); // Wait for fade-out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!phaseData) return null;

  const getPhaseColor = () => {
    const phase = phaseData.phase || 1;
    if (phase === 1) return 'from-blue-600 to-purple-600';
    if (phase === 2) return 'from-purple-600 to-red-600';
    if (phase === 3) return 'from-red-600 to-orange-600';
    return 'from-orange-600 to-yellow-600';
  };

  const getPhaseIcon = () => {
    const phase = phaseData.phase || 1;
    if (phase === 1) return <Crown className="text-white" size={60} />;
    if (phase === 2) return <Flame className="text-white" size={60} />;
    if (phase === 3) return <Skull className="text-white" size={60} />;
    return <Flame className="text-white" size={60} />;
  };

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center
        bg-black/80 backdrop-blur-md
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Animated Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`
          absolute inset-0 bg-gradient-to-r ${getPhaseColor()}
          animate-pulse opacity-20
        `} />
        
        {/* Particle Effect */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div
        className={`
          relative z-10 text-center
          transform transition-all duration-500
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}
        `}
      >
        {/* Boss Portrait/Icon */}
        <div className={`
          mx-auto mb-6 w-32 h-32 rounded-full
          bg-gradient-to-br ${getPhaseColor()}
          flex items-center justify-center
          animate-scale-pulse
          shadow-2xl shadow-red-500/50
          border-4 border-white
        `}>
          {getPhaseIcon()}
        </div>

        {/* Phase Announcement */}
        <div className="space-y-4">
          <h2 className="text-6xl font-bold text-white animate-pulse-glow">
            PHASE {phaseData.phase}
          </h2>
          
          {phaseData.name && (
            <h3 className="text-3xl font-semibold text-red-400 animate-fade-in">
              {phaseData.name}
            </h3>
          )}
          
          {phaseData.description && (
            <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-delayed">
              {phaseData.description}
            </p>
          )}

          {/* Phase Features */}
          {phaseData.features && phaseData.features.length > 0 && (
            <div className="mt-6 flex justify-center gap-4 flex-wrap">
              {phaseData.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg border border-red-600 text-sm font-semibold animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Animations (add to your global CSS or Tailwind config) */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          50% {
            transform: translateY(-100px) scale(1.5);
            opacity: 1;
          }
        }

        @keyframes scale-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
          }
          50% {
            text-shadow: 0 0 40px rgba(255, 255, 255, 0.8);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delayed {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          50% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-scale-pulse {
          animation: scale-pulse 2s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BossPhaseTransition;
