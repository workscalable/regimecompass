import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Target,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/router';

import OptionsRecommendationDashboard, { OptionsRecommendation } from '../components/OptionsRecommendationDashboard';
import { useOptionsData } from '../hooks/useOptionsData';

/**
 * Options Recommendations Page
 * 
 * Dedicated page for options analysis and recommendations:
 * - Smart strike/expiry suggestions with Greeks visualization
 * - Risk metrics and liquidity assessment
 * - Real-time options chain data
 * - Comprehensive recommendation ranking
 */

const OptionsPage: React.FC = () => {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY');
  const [confidence, setConfidence] = useState<number>(0.85);
  
  // Get options data
  const {
    recommendations,
    optionsChain,
    isLoading,
    error,
    refreshRecommendations,
    refreshOptionsChain
  } = useOptionsData(selectedSymbol);

  // Mock Fibonacci analysis
  const fibonacciAnalysis = {
    currentLevel: 0.618,
    targetZones: [420, 435, 450],
    expansion: 'MID_EXPANSION' as const
  };

  // Handle symbol change
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    // Update confidence based on symbol (mock logic)
    setConfidence(0.7 + Math.random() * 0.3);
  };

  // Handle recommendation selection
  const handleRecommendationSelect = (recommendation: OptionsRecommendation) => {
    console.log('Selected recommendation:', recommendation);
    // Could show detailed analysis modal or navigate to trade execution
  };

  // Handle refresh
  const handleRefresh = async () => {
    await Promise.all([
      refreshRecommendations(selectedSymbol),
      refreshOptionsChain(selectedSymbol)
    ]);
  };

  // Popular symbols for quick selection
  const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'];

  return (
    <>
      <Head>
        <title>Options Recommendations - Gamma Adaptive System</title>
        <meta name="description" content="Smart options recommendations with Greeks analysis and risk metrics" />
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
                  Options Recommendations
                </h1>
                
                {/* Symbol Selector */}
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="px-3 py-1 border rounded-md"
                >
                  {popularSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Status Indicators */}
                <Badge className={confidence >= 0.8 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {(confidence * 100).toFixed(1)}% Confidence
                </Badge>
                
                {recommendations.length > 0 && (
                  <Badge variant="outline">
                    <Target className="w-3 h-3 mr-1" />
                    {recommendations.length} Recommendations
                  </Badge>
                )}
                
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
              <span>Loading options data...</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {recommendations.length > 0 ? (
              <OptionsRecommendationDashboard
                symbol={selectedSymbol}
                recommendations={recommendations}
                optionsChain={optionsChain || undefined}
                confidence={confidence}
                expectedMove={optionsChain?.expectedMove || 0}
                fibonacciAnalysis={fibonacciAnalysis}
                onRecommendationSelect={handleRecommendationSelect}
                onRefresh={handleRefresh}
              />
            ) : (
              <EmptyState
                symbol={selectedSymbol}
                onRefresh={handleRefresh}
                onSymbolChange={handleSymbolChange}
              />
            )}
          </main>
        )}
      </div>
    </>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  symbol: string;
  onRefresh: () => void;
  onSymbolChange: (symbol: string) => void;
}> = ({ symbol, onRefresh, onSymbolChange }) => {
  const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL'];

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Options Recommendations
        </h3>
        <p className="text-gray-600 mb-6">
          No recommendations found for {symbol}. Try refreshing the data or selecting a different symbol.
        </p>
        
        <div className="space-y-4">
          <Button onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Or try these popular symbols:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {popularSymbols.map(sym => (
                <Button
                  key={sym}
                  variant="outline"
                  size="sm"
                  onClick={() => onSymbolChange(sym)}
                  className={sym === symbol ? 'bg-blue-50' : ''}
                >
                  {sym}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;