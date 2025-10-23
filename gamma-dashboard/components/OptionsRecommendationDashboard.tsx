import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';

// Utility functions
const getLiquidityColor = (score: number): string => {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  if (score >= 0.4) return 'text-orange-600';
  return 'text-red-600';
};

const getGreekColor = (value: number, type: 'delta' | 'gamma' | 'theta' | 'vega'): string => {
  switch (type) {
    case 'delta':
      return Math.abs(value) > 0.5 ? 'text-green-600' : 'text-gray-600';
    case 'gamma':
      return value > 0.05 ? 'text-blue-600' : 'text-gray-600';
    case 'theta':
      return Math.abs(value) > 0.1 ? 'text-red-600' : 'text-gray-600';
    case 'vega':
      return value > 0.2 ? 'text-purple-600' : 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

/**
 * Options Recommendation Dashboard Component
 * 
 * Displays smart options recommendations with comprehensive analytics:
 * - Smart strike/expiry suggestions based on confidence and expected moves
 * - Greeks visualization (Delta, Gamma, Theta, Vega, Rho)
 * - Risk metrics and reward analysis
 * - Liquidity assessment and recommendation ranking
 * - Real-time options chain data with bid/ask spreads
 */

export interface OptionsRecommendation {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiration: Date;
  daysToExpiration: number;
  
  // Pricing
  bid: number;
  ask: number;
  midPrice: number;
  lastPrice: number;
  impliedVolatility: number;
  
  // Greeks
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  
  // Risk/Reward Analysis
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  profitProbability: number;
  expectedReturn: number;
  riskRewardRatio: number;
  
  // Liquidity Metrics
  volume: number;
  openInterest: number;
  bidAskSpread: number;
  bidAskSpreadPercent: number;
  liquidityScore: number;
  
  // Recommendation Metrics
  confidence: number;
  rank: number;
  reasoning: string[];
  alerts: string[];
  
  // Market Context
  underlyingPrice: number;
  expectedMove: number;
  fibonacciLevel?: number;
  gammaExposure?: number;
  
  timestamp: Date;
}

export interface OptionsChainData {
  symbol: string;
  underlyingPrice: number;
  impliedVolatility: number;
  expectedMove: number;
  expirations: Date[];
  strikes: number[];
  calls: Map<string, OptionsRecommendation>; // key: strike_expiration
  puts: Map<string, OptionsRecommendation>;
  lastUpdate: Date;
}

export interface OptionsRecommendationDashboardProps {
  symbol: string;
  recommendations: OptionsRecommendation[];
  optionsChain?: OptionsChainData;
  confidence: number;
  expectedMove: number;
  fibonacciAnalysis?: {
    currentLevel: number;
    targetZones: number[];
    expansion: 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
  };
  onRecommendationSelect?: (recommendation: OptionsRecommendation) => void;
  onRefresh?: () => void;
}

const OptionsRecommendationDashboard: React.FC<OptionsRecommendationDashboardProps> = ({
  symbol,
  recommendations,
  optionsChain,
  confidence,
  expectedMove,
  fibonacciAnalysis,
  onRecommendationSelect,
  onRefresh
}) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptionsRecommendation | null>(null);
  const [viewMode, setViewMode] = useState<'recommendations' | 'chain' | 'greeks'>('recommendations');
  const [filterType, setFilterType] = useState<'ALL' | 'CALL' | 'PUT'>('ALL');
  const [sortBy, setSortBy] = useState<'rank' | 'confidence' | 'expectedReturn' | 'liquidity'>('rank');

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;
    
    if (filterType !== 'ALL') {
      filtered = filtered.filter(rec => rec.type === filterType);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return a.rank - b.rank;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'expectedReturn':
          return b.expectedReturn - a.expectedReturn;
        case 'liquidity':
          return b.liquidityScore - a.liquidityScore;
        default:
          return a.rank - b.rank;
      }
    });
  }, [recommendations, filterType, sortBy]);

  // Top 3 recommendations
  const topRecommendations = useMemo(() => {
    return filteredRecommendations.slice(0, 3);
  }, [filteredRecommendations]);

  const handleRecommendationClick = (recommendation: OptionsRecommendation) => {
    setSelectedRecommendation(recommendation);
    onRecommendationSelect?.(recommendation);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getLiquidityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGreekColor = (value: number, type: 'delta' | 'gamma' | 'theta' | 'vega'): string => {
    switch (type) {
      case 'delta':
        return Math.abs(value) > 0.5 ? 'text-green-600' : 'text-gray-600';
      case 'gamma':
        return value > 0.05 ? 'text-blue-600' : 'text-gray-600';
      case 'theta':
        return value < -0.05 ? 'text-red-600' : 'text-gray-600';
      case 'vega':
        return value > 0.1 ? 'text-purple-600' : 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Options Recommendations - {symbol}</h2>
          <Badge className={getConfidenceColor(confidence)}>
            {(confidence * 100).toFixed(1)}% Confidence
          </Badge>
          {fibonacciAnalysis && (
            <Badge variant="outline">
              {fibonacciAnalysis.expansion}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="ALL">All Options</option>
            <option value="CALL">Calls Only</option>
            <option value="PUT">Puts Only</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="rank">Sort by Rank</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="expectedReturn">Sort by Expected Return</option>
            <option value="liquidity">Sort by Liquidity</option>
          </select>
          
          <Button onClick={onRefresh} size="sm" variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Context */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">${optionsChain?.underlyingPrice.toFixed(2) || '0.00'}</div>
            <div className="text-sm text-gray-600">Underlying Price</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">${expectedMove.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Expected Move</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{((optionsChain?.impliedVolatility || 0) * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Implied Volatility</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <div className="text-sm text-gray-600">Recommendations</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as any)}>
        <TabsList>
          <TabsTrigger value="recommendations">Top Recommendations</TabsTrigger>
          <TabsTrigger value="chain">Options Chain</TabsTrigger>
          <TabsTrigger value="greeks">Greeks Analysis</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {/* Top 3 Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topRecommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                rank={index + 1}
                isSelected={selectedRecommendation?.id === recommendation.id}
                onClick={() => handleRecommendationClick(recommendation)}
              />
            ))}
          </div>

          {/* All Recommendations Table */}
          <RecommendationsTable
            recommendations={filteredRecommendations}
            selectedId={selectedRecommendation?.id}
            onSelect={handleRecommendationClick}
          />
        </TabsContent>

        {/* Options Chain Tab */}
        <TabsContent value="chain" className="space-y-4">
          {optionsChain && (
            <OptionsChainView
              optionsChain={optionsChain}
              expectedMove={expectedMove}
              onOptionSelect={(option) => handleRecommendationClick(option)}
            />
          )}
        </TabsContent>

        {/* Greeks Analysis Tab */}
        <TabsContent value="greeks" className="space-y-4">
          <GreeksAnalysis
            recommendations={filteredRecommendations}
            underlyingPrice={optionsChain?.underlyingPrice || 0}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Recommendation Details */}
      {selectedRecommendation && (
        <RecommendationDetails
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard: React.FC<{
  recommendation: OptionsRecommendation;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ recommendation, rank, isSelected, onClick }) => {
  const getRankBadgeColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-white';
      case 2: return 'bg-gray-400 text-white';
      case 3: return 'bg-orange-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={getRankBadgeColor(rank)}>
              #{rank}
            </Badge>
            <Badge className={recommendation.type === 'CALL' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
              {recommendation.type}
            </Badge>
          </div>
          <Badge className="bg-gray-100 text-gray-800">
            {recommendation.daysToExpiration}d
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Strike and Expiration */}
        <div className="text-center">
          <div className="text-xl font-bold">${recommendation.strike}</div>
          <div className="text-sm text-gray-600">
            {recommendation.expiration.toLocaleDateString()}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between text-sm">
          <span>Bid/Ask:</span>
          <span className="font-medium">
            ${recommendation.bid.toFixed(2)} / ${recommendation.ask.toFixed(2)}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Expected Return:</span>
            <span className={`font-medium ${
              recommendation.expectedReturn > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(recommendation.expectedReturn * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Risk/Reward:</span>
            <span className="font-medium">
              1:{recommendation.riskRewardRatio.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Liquidity:</span>
            <span className={`font-medium ${getLiquidityColor(recommendation.liquidityScore)}`}>
              {(recommendation.liquidityScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Confidence:</span>
            <span className="font-medium">
              {(recommendation.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={recommendation.confidence * 100} className="h-2" />
        </div>

        {/* Alerts */}
        {recommendation.alerts.length > 0 && (
          <div className="flex items-center space-x-1 text-sm text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{recommendation.alerts.length} alert{recommendation.alerts.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recommendations Table Component
const RecommendationsTable: React.FC<{
  recommendations: OptionsRecommendation[];
  selectedId?: string;
  onSelect: (recommendation: OptionsRecommendation) => void;
}> = ({ recommendations, selectedId, onSelect }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Rank</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Strike</th>
                <th className="text-left p-2">Expiration</th>
                <th className="text-left p-2">Bid/Ask</th>
                <th className="text-left p-2">IV</th>
                <th className="text-left p-2">Delta</th>
                <th className="text-left p-2">Expected Return</th>
                <th className="text-left p-2">Liquidity</th>
                <th className="text-left p-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <tr
                  key={rec.id}
                  className={`border-b cursor-pointer hover:bg-gray-50 ${
                    selectedId === rec.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSelect(rec)}
                >
                  <td className="p-2">
                    <Badge className="bg-blue-500 text-white">#{rec.rank}</Badge>
                  </td>
                  <td className="p-2">
                    <Badge className={rec.type === 'CALL' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                      {rec.type}
                    </Badge>
                  </td>
                  <td className="p-2 font-medium">${rec.strike}</td>
                  <td className="p-2">{rec.expiration.toLocaleDateString()}</td>
                  <td className="p-2">${rec.bid.toFixed(2)} / ${rec.ask.toFixed(2)}</td>
                  <td className="p-2">{(rec.impliedVolatility * 100).toFixed(1)}%</td>
                  <td className="p-2">
                    <span className={getGreekColor(rec.delta, 'delta')}>
                      {rec.delta.toFixed(3)}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={rec.expectedReturn > 0 ? 'text-green-600' : 'text-red-600'}>
                      {(rec.expectedReturn * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={getLiquidityColor(rec.liquidityScore)}>
                      {(rec.liquidityScore * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center space-x-2">
                      <span>{(rec.confidence * 100).toFixed(1)}%</span>
                      <Progress value={rec.confidence * 100} className="w-16 h-2" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Options Chain View Component
const OptionsChainView: React.FC<{
  optionsChain: OptionsChainData;
  expectedMove: number;
  onOptionSelect: (option: OptionsRecommendation) => void;
}> = ({ optionsChain, expectedMove, onOptionSelect }) => {
  const [selectedExpiration, setSelectedExpiration] = useState<Date>(
    optionsChain.expirations[0] || new Date()
  );

  // Get strikes around current price
  const currentPrice = optionsChain.underlyingPrice;
  const relevantStrikes = optionsChain.strikes
    .filter(strike => Math.abs(strike - currentPrice) <= expectedMove * 2)
    .sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Options Chain</CardTitle>
          <select
            value={selectedExpiration.toISOString()}
            onChange={(e) => setSelectedExpiration(new Date(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {optionsChain.expirations.map((exp) => (
              <option key={exp.toISOString()} value={exp.toISOString()}>
                {exp.toLocaleDateString()} ({Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d)
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-center p-2" colSpan={4}>CALLS</th>
                <th className="text-center p-2 bg-gray-100 font-bold">STRIKE</th>
                <th className="text-center p-2" colSpan={4}>PUTS</th>
              </tr>
              <tr className="border-b text-xs text-gray-600">
                <th className="p-1">Bid</th>
                <th className="p-1">Ask</th>
                <th className="p-1">Vol</th>
                <th className="p-1">OI</th>
                <th className="p-1 bg-gray-100"></th>
                <th className="p-1">Bid</th>
                <th className="p-1">Ask</th>
                <th className="p-1">Vol</th>
                <th className="p-1">OI</th>
              </tr>
            </thead>
            <tbody>
              {relevantStrikes.map((strike) => {
                const callKey = `${strike}_${selectedExpiration.toISOString()}`;
                const putKey = `${strike}_${selectedExpiration.toISOString()}`;
                const call = optionsChain.calls.get(callKey);
                const put = optionsChain.puts.get(putKey);
                
                const isAtTheMoney = Math.abs(strike - currentPrice) < 2.5;
                const isInExpectedMove = Math.abs(strike - currentPrice) <= expectedMove;

                return (
                  <tr
                    key={strike}
                    className={`border-b hover:bg-gray-50 ${
                      isAtTheMoney ? 'bg-yellow-50' : 
                      isInExpectedMove ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Call Data */}
                    <td className="p-1 text-center cursor-pointer hover:bg-green-100" 
                        onClick={() => call && onOptionSelect(call)}>
                      {call ? `$${call.bid.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1 text-center cursor-pointer hover:bg-green-100"
                        onClick={() => call && onOptionSelect(call)}>
                      {call ? `$${call.ask.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1 text-center text-xs">
                      {call ? call.volume.toLocaleString() : '-'}
                    </td>
                    <td className="p-1 text-center text-xs">
                      {call ? call.openInterest.toLocaleString() : '-'}
                    </td>
                    
                    {/* Strike */}
                    <td className={`p-2 text-center font-bold bg-gray-100 ${
                      isAtTheMoney ? 'bg-yellow-200' : ''
                    }`}>
                      ${strike}
                    </td>
                    
                    {/* Put Data */}
                    <td className="p-1 text-center cursor-pointer hover:bg-red-100"
                        onClick={() => put && onOptionSelect(put)}>
                      {put ? `$${put.bid.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1 text-center cursor-pointer hover:bg-red-100"
                        onClick={() => put && onOptionSelect(put)}>
                      {put ? `$${put.ask.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1 text-center text-xs">
                      {put ? put.volume.toLocaleString() : '-'}
                    </td>
                    <td className="p-1 text-center text-xs">
                      {put ? put.openInterest.toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-200"></div>
            <span>At-the-money</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100"></div>
            <span>Within expected move</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Vol = Volume, OI = Open Interest</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Greeks Analysis Component
const GreeksAnalysis: React.FC<{
  recommendations: OptionsRecommendation[];
  underlyingPrice: number;
}> = ({ recommendations, underlyingPrice }) => {
  const [selectedGreek, setSelectedGreek] = useState<'delta' | 'gamma' | 'theta' | 'vega'>('delta');

  const greeksData = useMemo(() => {
    return recommendations.map(rec => ({
      ...rec,
      moneyness: (rec.strike - underlyingPrice) / underlyingPrice,
      intrinsicValue: rec.type === 'CALL' 
        ? Math.max(0, underlyingPrice - rec.strike)
        : Math.max(0, rec.strike - underlyingPrice),
      timeValue: rec.midPrice - (rec.type === 'CALL' 
        ? Math.max(0, underlyingPrice - rec.strike)
        : Math.max(0, rec.strike - underlyingPrice))
    }));
  }, [recommendations, underlyingPrice]);

  const getGreekDescription = (greek: string): string => {
    switch (greek) {
      case 'delta':
        return 'Price sensitivity to $1 move in underlying';
      case 'gamma':
        return 'Rate of change of delta';
      case 'theta':
        return 'Time decay per day';
      case 'vega':
        return 'Sensitivity to 1% change in volatility';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Greeks Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['delta', 'gamma', 'theta', 'vega'].map((greek) => {
          const avgValue = greeksData.reduce((sum, rec) => sum + (rec[greek as keyof OptionsRecommendation] as number), 0) / greeksData.length;
          
          return (
            <Card 
              key={greek}
              className={`cursor-pointer transition-colors ${
                selectedGreek === greek ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedGreek(greek as any)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold capitalize">{greek}</div>
                <div className="text-lg font-medium">
                  {avgValue.toFixed(3)}
                </div>
                <div className="text-xs text-gray-600">
                  {getGreekDescription(greek)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Greeks Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{selectedGreek} Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Option</th>
                  <th className="text-left p-2">Strike</th>
                  <th className="text-left p-2">Moneyness</th>
                  <th className="text-left p-2">Intrinsic</th>
                  <th className="text-left p-2">Time Value</th>
                  <th className="text-left p-2 capitalize">{selectedGreek}</th>
                  <th className="text-left p-2">Impact</th>
                </tr>
              </thead>
              <tbody>
                {greeksData
                  .sort((a, b) => Math.abs(b[selectedGreek]) - Math.abs(a[selectedGreek]))
                  .map((rec) => {
                    const greekValue = rec[selectedGreek];
                    const impact = selectedGreek === 'delta' ? `$${(greekValue * 1).toFixed(2)}` :
                                  selectedGreek === 'gamma' ? `${(greekValue * 1).toFixed(3)}` :
                                  selectedGreek === 'theta' ? `$${(greekValue * 1).toFixed(2)}` :
                                  `$${(greekValue * 0.01).toFixed(2)}`;

                    return (
                      <tr key={rec.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={rec.type === 'CALL' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                              {rec.type}
                            </Badge>
                            <span className="text-xs">{rec.daysToExpiration}d</span>
                          </div>
                        </td>
                        <td className="p-2 font-medium">${rec.strike}</td>
                        <td className="p-2">
                          <span className={rec.moneyness > 0 ? 'text-red-600' : rec.moneyness < -0.05 ? 'text-green-600' : 'text-gray-600'}>
                            {(rec.moneyness * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2">${rec.intrinsicValue.toFixed(2)}</td>
                        <td className="p-2">${rec.timeValue.toFixed(2)}</td>
                        <td className="p-2">
                          <span className={getGreekColor(greekValue, selectedGreek)}>
                            {greekValue.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-2 font-medium">{impact}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Recommendation Details Component
const RecommendationDetails: React.FC<{
  recommendation: OptionsRecommendation;
  onClose: () => void;
}> = ({ recommendation, onClose }) => {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle>
              {recommendation.symbol} ${recommendation.strike} {recommendation.type}
            </CardTitle>
            <Badge className={recommendation.type === 'CALL' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
              {recommendation.type}
            </Badge>
            <Badge variant="outline">
              Expires {recommendation.expiration.toLocaleDateString()}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">${recommendation.midPrice.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Mid Price</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              recommendation.expectedReturn > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(recommendation.expectedReturn * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Expected Return</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">1:{recommendation.riskRewardRatio.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Risk/Reward</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(recommendation.profitProbability * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Profit Probability</div>
          </div>
        </div>

        {/* Greeks */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Greeks</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className={`text-xl font-bold ${getGreekColor(recommendation.delta, 'delta')}`}>
                {recommendation.delta.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Delta</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${getGreekColor(recommendation.gamma, 'gamma')}`}>
                {recommendation.gamma.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Gamma</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${getGreekColor(recommendation.theta, 'theta')}`}>
                {recommendation.theta.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Theta</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${getGreekColor(recommendation.vega, 'vega')}`}>
                {recommendation.vega.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Vega</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {recommendation.rho.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Rho</div>
            </div>
          </div>
        </div>

        {/* Liquidity Analysis */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Liquidity Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{recommendation.volume.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{recommendation.openInterest.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Open Interest</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">${recommendation.bidAskSpread.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Bid/Ask Spread</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${getLiquidityColor(recommendation.liquidityScore)}`}>
                {(recommendation.liquidityScore * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Liquidity Score</div>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recommendation Reasoning</h3>
          <div className="space-y-2">
            {recommendation.reasoning.map((reason, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {recommendation.alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Alerts</h3>
            <div className="space-y-2">
              {recommendation.alerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">{alert}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptionsRecommendationDashboard;