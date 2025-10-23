'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setShowTimeout(timeout);
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  }, [showTimeout]);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap ${positionClasses[position]} ${className}`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// Specialized tooltip for trading signals
export function SignalTooltip({ 
  signal, 
  children 
}: { 
  signal: {
    entry?: number;
    stopLoss?: number;
    target?: number;
    confidence?: number;
    reasoning?: string[];
  };
  children: React.ReactNode;
}) {
  const tooltipContent = (
    <div className="text-left space-y-1 max-w-xs">
      {signal.entry && (
        <div className="text-green-300">Entry: ${signal.entry.toFixed(2)}</div>
      )}
      {signal.stopLoss && (
        <div className="text-red-300">Stop: ${signal.stopLoss.toFixed(2)}</div>
      )}
      {signal.target && (
        <div className="text-blue-300">Target: ${signal.target.toFixed(2)}</div>
      )}
      {signal.confidence && (
        <div className="text-yellow-300">
          Confidence: {(signal.confidence * 100).toFixed(0)}%
        </div>
      )}
      {signal.reasoning && signal.reasoning.length > 0 && (
        <div className="text-gray-300 text-xs mt-2 pt-2 border-t border-gray-600">
          {signal.reasoning.join(', ')}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="right" delay={200}>
      {children}
    </Tooltip>
  );
}

// Tooltip for regime indicators
export function RegimeTooltip({
  regime,
  factors,
  children
}: {
  regime: string;
  factors?: {
    breadth?: boolean;
    emaAlignment?: boolean;
    trendScore?: boolean;
    volatility?: boolean;
    gamma?: boolean;
  };
  children: React.ReactNode;
}) {
  const tooltipContent = (
    <div className="text-left space-y-1">
      <div className="font-semibold">{regime} Regime</div>
      {factors && (
        <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
          <div className={factors.breadth ? 'text-green-300' : 'text-red-300'}>
            Breadth: {factors.breadth ? '✓' : '✗'}
          </div>
          <div className={factors.emaAlignment ? 'text-green-300' : 'text-red-300'}>
            EMA Alignment: {factors.emaAlignment ? '✓' : '✗'}
          </div>
          <div className={factors.trendScore ? 'text-green-300' : 'text-red-300'}>
            Trend Score: {factors.trendScore ? '✓' : '✗'}
          </div>
          <div className={factors.volatility ? 'text-green-300' : 'text-red-300'}>
            Volatility: {factors.volatility ? '✓' : '✗'}
          </div>
          <div className={factors.gamma ? 'text-green-300' : 'text-red-300'}>
            Gamma: {factors.gamma ? '✓' : '✗'}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="bottom" delay={100}>
      {children}
    </Tooltip>
  );
}