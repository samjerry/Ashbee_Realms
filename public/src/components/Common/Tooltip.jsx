/**
 * Tooltip.jsx
 * Reusable tooltip component for UI help text
 */

import React, { useState } from 'react';

export default function Tooltip({ children, text, position = 'top' }) {
  const [show, setShow] = useState(false);

  if (!text) return children;

  const positionClasses = {
    top: '-top-10 left-1/2 -translate-x-1/2',
    bottom: '-bottom-10 left-1/2 -translate-x-1/2',
    left: 'top-1/2 -left-2 -translate-y-1/2 -translate-x-full',
    right: 'top-1/2 -right-2 -translate-y-1/2 translate-x-full'
  };

  const arrowClasses = {
    top: 'w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2',
    bottom: 'w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1/2',
    left: 'w-2 h-2 bg-gray-900 transform rotate-45 -right-1 top-1/2 -translate-y-1/2',
    right: 'w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-1/2 -translate-y-1/2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div 
          className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
          style={{ maxWidth: '250px', whiteSpace: 'normal' }}
        >
          {text}
          <div className={`absolute ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
}
