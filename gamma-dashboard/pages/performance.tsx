import React, { useState } from 'react';
import Head from 'next/head';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  Download,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/router';

import PaperTradingDashboard from '../components/PaperTradingDashboard';
import { usePaperTradingData } from '../hooks/usePaperTradingData';

/**
 * Performance Analytics Page
 * 
 * Dedicated page for paper trading performance analysis:
 * - Real-time PnL and position tracking
 * - Performance charts and analytics
 * - Trade analysis with filtering and export
 * - Portfolio Greeks and risk metrics
 */

const PerformancePage: React.FC = () => {
  const router = useRouter();
  
  const {
    positions,
    trades,
    metrics,
    isLive,
    isLoading,
    error,
    closePosition,
    exportData,
    refreshData,
    setLiveTrading,
    filteredTrades,
    applyFilters
  } = usePaperTradingData();

  const handleToggleLive = () => {
    setLiveTrading(!isLive);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleExport = () => {
    exportData();
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      await closePosition(positionId);
    } catch (err) {
      console.error('Failed to close position:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Performance Analytics - Gamma Adaptive System</title>
        <meta name="description" content="Paper trading performance analytics with real-time PnL tracking" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                
                <h1 className="text-xl font-semibold text-gray-900">
                  Performance Analytics
                </h1>
                
                {/* Status Indicators */}
                <Badge className={isLive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                  {isLive ? 'Live Trading' : 'Paused'}
                </Badge>
                
                {metrics.totalPnL && (
                  <Badge className={metrics.totalPnL >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    ${metrics.totalPnL.toLocaleString()}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Live Trading Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLive}
                >
                  {isLive ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  )}
                </Button>
                
                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading performance data...</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PaperTradingDashboard
              positions={positions}
              trades={trades}
              metrics={metrics}
              isLive={isLive}
              onExportData={handleExport}
              onClosePosition={handleClosePosition}
              onFilterChange={applyFilters}
            />
          </main>
        )}
      </div>
    </>
  );
};

export default PerformancePage;