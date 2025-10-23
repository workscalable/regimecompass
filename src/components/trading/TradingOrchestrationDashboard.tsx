'use client';

import { useState, useEffect } from 'react';
import { TradeSignal, SystemHealth } from '@/lib/trading';

interface TradingOrchestrationDashboardProps {
  className?: string;
}

export default function TradingOrchestrationDashboard({ className = '' }: TradingOrchestrationDashboardProps) {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch signals
      const signalsResponse = await fetch('/api/trading/signals');
      const signalsData = await signalsResponse.json();
      if (signalsData.success) {
        setSignals(signalsData.data);
      }

      // Fetch health
      const healthResponse = await fetch('/api/trading/health');
      const healthData = await healthResponse.json();
      if (healthData.success) {
        setHealth(healthData.data.health);
        setSystemStatus(healthData.data.status);
      }

    } catch (err) {
      setError('Failed to fetch trading data');
      console.error('Error fetching trading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startSystem = async () => {
    try {
      const response = await fetch('/api/trading/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await response.json();
      if (data.success) {
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error('Error starting system:', err);
    }
  };

  const stopSystem = async () => {
    try {
      const response = await fetch('/api/trading/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      const data = await response.json();
      if (data.success) {
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error('Error stopping system:', err);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trading system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Trading Orchestration System</h2>
          <div className="flex space-x-2">
            <button
              onClick={startSystem}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start
            </button>
            <button
              onClick={stopSystem}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop
            </button>
          </div>
        </div>

        {health && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">System Health</h3>
              <p className={`text-lg font-semibold ${getHealthColor(health.overall)}`}>
                {health.overall.toUpperCase()}
              </p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Active Signals</h3>
              <p className="text-lg font-semibold text-blue-400">{signals.length}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Performance</h3>
              <p className="text-lg font-semibold text-green-400">
                {health.performance.signalsPerMinute} signals/min
              </p>
            </div>
          </div>
        )}

        {systemStatus && (
          <div className="bg-gray-700 rounded p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">System Status</h3>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded text-sm ${
                systemStatus.isRunning ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {systemStatus.isRunning ? 'RUNNING' : 'STOPPED'}
              </span>
              <span className="text-gray-400">
                Monitoring: {systemStatus.symbols?.join(', ') || 'None'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Active Signals */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Active Trading Signals</h2>
        
        {signals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No active signals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {signals.map((signal, index) => (
              <div key={`${signal.symbol}-${index}`} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{signal.symbol}</h3>
                    <p className="text-sm text-gray-400">
                      {signal.pattern} • {signal.direction} • Entry: ${signal.entry.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getConfidenceColor(signal.confidenceScore)}`}>
                      {(signal.confidenceScore * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-400">Confidence</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-400">Targets</p>
                    <p className="text-sm">
                      {signal.targets.map(t => `$${t.toFixed(2)}`).join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Stop Loss</p>
                    <p className="text-sm">${signal.stopLoss.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Strikes</p>
                    <p className="text-sm">{signal.recommendedStrikes.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Confirmations</p>
                    <p className="text-sm">
                      {signal.confirmations.LTF.length + signal.confirmations.HTF.length}
                    </p>
                  </div>
                </div>

                {signal.signalEvolution.length > 0 && (
                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-sm text-gray-400 mb-2">Signal Evolution</p>
                    <div className="flex space-x-2">
                      {signal.signalEvolution.map((evolution, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                        >
                          {evolution.stage}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module Health */}
      {health && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Module Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.modules).map(([module, status]) => (
              <div key={module} className="bg-gray-700 rounded p-3">
                <p className="text-sm font-medium capitalize">
                  {module.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className={`text-sm ${getHealthColor(status)}`}>
                  {status.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

