'use client';

import React, { useState, useEffect } from 'react';
import { PaperPosition, PerformanceMetrics } from '../../../gamma-services/models/PaperTradingTypes';

interface PaperTradingDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AccountSummary {
  accountId: string;
  balance: number;
  initialBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  openPositions: number;
  totalTrades: number;
  availableBalance: number;
}

interface SystemStatus {
  isRunning: boolean;
  mode: 'single-ticker' | 'multi-ticker';
  activeTickers: number;
  activePositions: number;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastUpdate: Date;
}

export const PaperTradingDashboard: React.FC<PaperTradingDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 3000
}) => {
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'positions' | 'performance' | 'system'>('overview');

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchData = async () => {
    try {
      setError(null);
      
      const [accountRes, positionsRes, performanceRes, statusRes] = await Promise.all([
        fetch('/api/paper/account'),
        fetch('/api/paper/positions'),
        fetch('/api/paper/performance'),
        fetch('/api/paper/system/status')
      ]);

      if (!accountRes.ok || !positionsRes.ok || !performanceRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [account, positionsData, performanceData, status] = await Promise.all([
        accountRes.json(),
        positionsRes.json(),
        performanceRes.json(),
        statusRes.json()
      ]);

      setAccountSummary(account);
      setPositions(positionsData);
      setPerformance(performanceData);
      setSystemStatus(status);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'DEGRADED': return 'text-yellow-600';
      case 'UNHEALTHY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPnLColor = (pnl: number): string => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">📄 Paper Trading Dashboard</h2>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${getStatusColor(systemStatus?.systemHealth || 'UNHEALTHY')}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                systemStatus?.systemHealth === 'HEALTHY' ? 'bg-green-500' :
                systemStatus?.systemHealth === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">{systemStatus?.systemHealth || 'Unknown'}</span>
            </div>
            <button
              onClick={fetchData}
              className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'positions', label: 'Positions' },
            { id: 'performance', label: 'Performance' },
            { id: 'system', label: 'System' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Account Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {formatCurrency(accountSummary?.balance || 0)}
                </div>
                <div className="text-sm text-blue-600">Account Balance</div>
              </div>
              
              <div className={`rounded-lg p-4 text-center ${
                (accountSummary?.totalPnL || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl font-bold ${getPnLColor(accountSummary?.totalPnL || 0)}`}>
                  {formatCurrency(accountSummary?.totalPnL || 0)}
                </div>
                <div className="text-sm text-gray-600">Total P&L</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {accountSummary?.openPositions || 0}
                </div>
                <div className="text-sm text-purple-600">Open Positions</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {performance?.winRate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-600">Win Rate</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Performance Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Trades:</span>
                    <span className="font-medium">{performance?.totalTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit Factor:</span>
                    <span className="font-medium">{performance?.profitFactor?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sharpe Ratio:</span>
                    <span className="font-medium">{performance?.sharpeRatio?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Drawdown:</span>
                    <span className="font-medium text-red-600">
                      {formatPercent(performance?.maxDrawdownPercent || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">System Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="font-medium capitalize">{systemStatus?.mode || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Tickers:</span>
                    <span className="font-medium">{systemStatus?.activeTickers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Positions:</span>
                    <span className="font-medium">{systemStatus?.activePositions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Update:</span>
                    <span className="font-medium text-sm">
                      {systemStatus?.lastUpdate ? new Date(systemStatus.lastUpdate).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'positions' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Open Positions ({positions.filter(p => p.status === 'OPEN').length})</h3>
            
            {positions.filter(p => p.status === 'OPEN').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No open positions
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.filter(p => p.status === 'OPEN').map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap font-medium">{position.ticker}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            position.contractType === 'CALL' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {position.contractType}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">${position.strike}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {new Date(position.expiration).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{position.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap">${position.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">${position.currentPrice.toFixed(2)}</td>
                        <td className={`px-4 py-2 whitespace-nowrap font-medium ${getPnLColor(position.pnl)}`}>
                          {formatCurrency(position.pnl)}
                          <div className="text-xs">
                            {formatPercent(position.pnlPercent)}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${position.confidence * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{(position.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Trading Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Trades:</span>
                    <span className="font-medium">{performance?.totalTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Winning Trades:</span>
                    <span className="font-medium text-green-600">{performance?.winningTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Losing Trades:</span>
                    <span className="font-medium text-red-600">{performance?.losingTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span className="font-medium">{performance?.winRate?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Win:</span>
                    <span className="font-medium text-green-600">{formatCurrency(performance?.averageWin || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Loss:</span>
                    <span className="font-medium text-red-600">{formatCurrency(performance?.averageLoss || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Risk Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Profit Factor:</span>
                    <span className="font-medium">{performance?.profitFactor?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sharpe Ratio:</span>
                    <span className="font-medium">{performance?.sharpeRatio?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Drawdown:</span>
                    <span className="font-medium text-red-600">{formatCurrency(performance?.maxDrawdown || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max DD %:</span>
                    <span className="font-medium text-red-600">{formatPercent(performance?.maxDrawdownPercent || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Trade:</span>
                    <span className="font-medium text-green-600">{formatCurrency(performance?.bestTrade || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Worst Trade:</span>
                    <span className="font-medium text-red-600">{formatCurrency(performance?.worstTrade || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Returns Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getPnLColor(performance?.totalPnL || 0)}`}>
                    {formatPercent(performance?.returnsPercent || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Return</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {performance?.averageHoldingPeriod?.toFixed(1) || '0.0'}h
                  </div>
                  <div className="text-sm text-gray-600">Avg Holding Period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {Math.max(performance?.consecutiveWins || 0, performance?.consecutiveLosses || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Max Streak</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${getStatusColor(systemStatus?.systemHealth || 'UNHEALTHY')}`}>
                      {systemStatus?.isRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="font-medium capitalize">{systemStatus?.mode || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health:</span>
                    <span className={`font-medium ${getStatusColor(systemStatus?.systemHealth || 'UNHEALTHY')}`}>
                      {systemStatus?.systemHealth || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Tickers:</span>
                    <span className="font-medium">{systemStatus?.activeTickers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Positions:</span>
                    <span className="font-medium">{systemStatus?.activePositions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Update:</span>
                    <span className="font-medium text-sm">
                      {systemStatus?.lastUpdate ? new Date(systemStatus.lastUpdate).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Account Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Account ID:</span>
                  <span className="font-medium font-mono text-sm">{accountSummary?.accountId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Balance:</span>
                  <span className="font-medium">{formatCurrency(accountSummary?.initialBalance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Balance:</span>
                  <span className="font-medium">{formatCurrency(accountSummary?.availableBalance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="font-medium">{accountSummary?.totalTrades || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};