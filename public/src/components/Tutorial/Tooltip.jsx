import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Book, Lightbulb } from 'lucide-react';

const Tooltip = ({ id, children, category }) => {
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && id) {
      fetchTooltip();
    }
  }, [visible, id]);

  const fetchTooltip = async () => {
    try {
      const response = await fetch(`/api/tutorial/tooltip/${id}`);
      const data = await response.json();
      if (data.success) {
        setTooltip(data.tooltip);
      }
    } catch (error) {
      console.error('Failed to fetch tooltip:', error);
    }
  };

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX
    });
    setVisible(true);
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children || (
          <HelpCircle className="text-gray-400 hover:text-primary-500 transition-colors" size={16} />
        )}
      </div>

      {visible && tooltip && (
        <div
          className="fixed z-[200] animate-fade-in"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-2xl p-4 max-w-sm">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Book size={16} className="text-primary-500" />
                {tooltip.title}
              </h4>
              {tooltip.hotkey && (
                <kbd className="px-2 py-1 text-xs bg-dark-700 text-gray-300 rounded border border-dark-600">
                  {tooltip.hotkey}
                </kbd>
              )}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {tooltip.description}
            </p>
            {tooltip.relatedTips && tooltip.relatedTips.length > 0 && (
              <div className="mt-3 pt-3 border-t border-dark-700">
                <p className="text-xs text-gray-500 mb-1">Related:</p>
                <div className="flex flex-wrap gap-1">
                  {tooltip.relatedTips.slice(0, 3).map((tip, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-primary-900/30 text-primary-300 rounded"
                    >
                      {tip.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TooltipProvider = ({ children, enabled = true }) => {
  const [tooltipsEnabled, setTooltipsEnabled] = useState(enabled);

  useEffect(() => {
    // Load tooltip preference from localStorage
    const stored = localStorage.getItem('tooltipsEnabled');
    if (stored !== null) {
      setTooltipsEnabled(JSON.parse(stored));
    }
  }, []);

  const toggleTooltips = () => {
    const newValue = !tooltipsEnabled;
    setTooltipsEnabled(newValue);
    localStorage.setItem('tooltipsEnabled', JSON.stringify(newValue));
  };

  return (
    <div data-tooltips-enabled={tooltipsEnabled}>
      {children}
    </div>
  );
};

export { Tooltip, TooltipProvider };
export default Tooltip;
