'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Brain, 
  Zap,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Calculator,
  Activity,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';

interface OptionContract {
  id: string;
  ticker: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  intrinsicValue: number;
  timeValue: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';
  confidence: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface GreeksAnalysis {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  totalGreeks: number;
  riskScore: number;
  recommendation: string;
}

export default function OptionsTradingPage() {
  const [selectedTicker, setSelectedTicker] = useState('SPY');
  const [selectedExpiry, setSelectedExpiry] = useState('2024-01-19');
  const [selectedType, setSelectedType] = useState<'CALL' | 'PUT'>('CALL');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Mock options data
  const [optionsData, setOptionsData] = useState<OptionContract[]>([
    {
      id: '1',
      ticker: 'SPY',
      type: 'CALL',
      strike: 450,
      expiry: '2024-01-19',
      bid: 2.45,
      ask: 2.50,
      last: 2.47,
      volume: 1250,
      openInterest: 15420,
      impliedVolatility: 0.18,
      delta: 0.65,
      gamma: 0.02,
      theta: -0.15,
      vega: 0.08,
      rho: 0.03,
      intrinsicValue: 2.30,
      timeValue: 0.17,
      moneyness: 'ITM',
      confidence: 0.89,
      recommendation: 'BUY',
      riskLevel: 'MEDIUM'
    },
    {
      id: '2',
      ticker: 'SPY',
      type: 'CALL',
      strike: 455,
      expiry: '2024-01-19',
      bid: 1.80,
      ask: 1.85,
      last: 1.82,
      volume: 890,
      openInterest: 12300,
      impliedVolatility: 0.19,
      delta: 0.45,
      gamma: 0.03,
      theta: -0.12,
      vega: 0.06,
      rho: 0.02,
      intrinsicValue: 1.30,
      timeValue: 0.52,
      moneyness: 'OTM',
      confidence: 0.72,
      recommendation: 'HOLD',
      riskLevel: 'HIGH'
    },
    {
      id: '3',
      ticker: 'SPY',
      type: 'PUT',
      strike: 440,
      expiry: '2024-01-19',
      bid: 1.20,
      ask: 1.25,
      last: 1.22,
      volume: 650,
      openInterest: 8900,
      impliedVolatility: 0.20,
      delta: -0.35,
      gamma: 0.02,
      theta: -0.10,
      vega: 0.05,
      rho: -0.02,
      intrinsicValue: 0.80,
      timeValue: 0.42,
      moneyness: 'OTM',
      confidence: 0.68,
      recommendation: 'SELL',
      riskLevel: 'LOW'
    }
  ]);

  const [greeksAnalysis, setGreeksAnalysis] = useState<GreeksAnalysis>({
    delta: 0.65,
    gamma: 0.02,
    theta: -0.15,
    vega: 0.08,
    rho: 0.03,
    totalGreeks: 0.63,
    riskScore: 0.72,
    recommendation: 'Moderate risk with positive delta exposure'
  });

  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalValue: 125000,
    totalDelta: 0.65,
    totalGamma: 0.02,
    totalTheta: -0.15,
    totalVega: 0.08,
    totalRho: 0.03,
    portfolioBeta: 0.95,
    maxRisk: 0.20,
    currentRisk: 0.12
  });

  const [marketData, setMarketData] = useState({
    underlying: 452.30,
    change: 2.15,
    changePercent: 0.48,
    volume: 45000000,
    volatility: 0.18,
    timeToExpiry: 15
  });

  const getMoneynessColor = (moneyness: string) => {
    switch (moneyness) {
      case 'ITM': return 'text-green-400 bg-green-900/20';
      case 'ATM': return 'text-yellow-400 bg-yellow-900/20';
      case 'OTM': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY': return 'text-green-400 bg-green-900/20';
      case 'SELL': return 'text-red-400 bg-red-900/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-400 bg-green-900/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20';
      case 'HIGH': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGreeksColor = (value: number, type: string) => {
    if (type === 'delta') {
      if (value > 0.5) return 'text-green-400';
      if (value > 0.2) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (type === 'gamma') {
      if (value > 0.02) return 'text-green-400';
      if (value > 0.01) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (type === 'theta') {
      if (value > -0.1) return 'text-green-400';
      if (value > -0.2) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (type === 'vega') {
      if (value > 0.05) return 'text-green-400';
      if (value > 0.02) return 'text-yellow-400';
      return 'text-red-400';
    }
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold">Options Trading</h1>
              </div>
              <Badge className="bg-blue-900/20 text-blue-400 px-3 py-1">
                {selectedTicker} Options
              </Badge>
              <Badge className="bg-green-900/20 text-green-400 px-3 py-1">
                {marketData.underlying.toFixed(2)} ({marketData.change > 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%)
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-400">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
              
              <Button
                variant={isLive ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center space-x-2"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isLive ? 'Pause' : 'Start'}</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chain" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chain" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Options Chain</span>
            </TabsTrigger>
            <TabsTrigger value="greeks" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Greeks</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Risk</span>
            </TabsTrigger>
          </TabsList>

          {/* Options Chain Tab */}
          <TabsContent value="chain" className="space-y-6">
            {/* Filters */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Options Chain Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="ticker">Ticker</Label>
                    <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SPY">SPY</SelectItem>
                        <SelectItem value="QQQ">QQQ</SelectItem>
                        <SelectItem value="AAPL">AAPL</SelectItem>
                        <SelectItem value="TSLA">TSLA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="expiry">Expiry</Label>
                    <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-01-19">Jan 19, 2024</SelectItem>
                        <SelectItem value="2024-02-16">Feb 16, 2024</SelectItem>
                        <SelectItem value="2024-03-15">Mar 15, 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={selectedType} onValueChange={(value: 'CALL' | 'PUT') => setSelectedType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CALL">Calls</SelectItem>
                        <SelectItem value="PUT">Puts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="strike">Strike Range</Label>
                    <Input placeholder="e.g., 440-460" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options Chain */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Options Chain - {selectedTicker} {selectedExpiry}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Strike</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Bid</th>
                        <th className="text-left py-3 px-4">Ask</th>
                        <th className="text-left py-3 px-4">Last</th>
                        <th className="text-left py-3 px-4">Volume</th>
                        <th className="text-left py-3 px-4">OI</th>
                        <th className="text-left py-3 px-4">IV</th>
                        <th className="text-left py-3 px-4">Delta</th>
                        <th className="text-left py-3 px-4">Gamma</th>
                        <th className="text-left py-3 px-4">Theta</th>
                        <th className="text-left py-3 px-4">Vega</th>
                        <th className="text-left py-3 px-4">Moneyness</th>
                        <th className="text-left py-3 px-4">Confidence</th>
                        <th className="text-left py-3 px-4">Recommendation</th>
                        <th className="text-left py-3 px-4">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionsData.map((option) => (
                        <tr key={option.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-3 px-4 font-medium">{option.strike}</td>
                          <td className="py-3 px-4">
                            <Badge className={option.type === 'CALL' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}>
                              {option.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{option.bid.toFixed(2)}</td>
                          <td className="py-3 px-4">{option.ask.toFixed(2)}</td>
                          <td className="py-3 px-4 font-medium">{option.last.toFixed(2)}</td>
                          <td className="py-3 px-4">{option.volume.toLocaleString()}</td>
                          <td className="py-3 px-4">{option.openInterest.toLocaleString()}</td>
                          <td className="py-3 px-4">{(option.impliedVolatility * 100).toFixed(1)}%</td>
                          <td className={`py-3 px-4 ${getGreeksColor(option.delta, 'delta')}`}>
                            {option.delta.toFixed(3)}
                          </td>
                          <td className={`py-3 px-4 ${getGreeksColor(option.gamma, 'gamma')}`}>
                            {option.gamma.toFixed(3)}
                          </td>
                          <td className={`py-3 px-4 ${getGreeksColor(option.theta, 'theta')}`}>
                            {option.theta.toFixed(3)}
                          </td>
                          <td className={`py-3 px-4 ${getGreeksColor(option.vega, 'vega')}`}>
                            {option.vega.toFixed(3)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getMoneynessColor(option.moneyness)}>
                              {option.moneyness}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getConfidenceColor(option.confidence)}>
                              {(option.confidence * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getRecommendationColor(option.recommendation)}>
                              {option.recommendation}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getRiskLevelColor(option.riskLevel)}>
                              {option.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Greeks Tab */}
          <TabsContent value="greeks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Greeks Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Delta</span>
                        <span className={`font-medium ${getGreeksColor(greeksAnalysis.delta, 'delta')}`}>
                          {greeksAnalysis.delta.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Price sensitivity to underlying
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Gamma</span>
                        <span className={`font-medium ${getGreeksColor(greeksAnalysis.gamma, 'gamma')}`}>
                          {greeksAnalysis.gamma.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Delta sensitivity to price
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Theta</span>
                        <span className={`font-medium ${getGreeksColor(greeksAnalysis.theta, 'theta')}`}>
                          {greeksAnalysis.theta.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Time decay per day
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Vega</span>
                        <span className={`font-medium ${getGreeksColor(greeksAnalysis.vega, 'vega')}`}>
                          {greeksAnalysis.vega.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Volatility sensitivity
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">Total Greeks</span>
                      <span className="font-medium text-white">
                        {greeksAnalysis.totalGreeks.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {greeksAnalysis.recommendation}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Score</span>
                      <span className="text-white font-medium">
                        {(greeksAnalysis.riskScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Beta</span>
                      <span className="text-white font-medium">{portfolioMetrics.portfolioBeta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Risk</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.currentRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Risk</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.maxRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Risk Level</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${(portfolioMetrics.currentRisk / portfolioMetrics.maxRisk) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">
                        {((portfolioMetrics.currentRisk / portfolioMetrics.maxRisk) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Portfolio Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Value</span>
                      <span className="text-white font-medium">
                        ${portfolioMetrics.totalValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Delta</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalDelta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Gamma</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalGamma.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Theta</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalTheta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Vega</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalVega.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Greeks Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Delta Exposure</span>
                      <span className="text-green-400 font-medium">
                        {portfolioMetrics.totalDelta > 0 ? '+' : ''}{portfolioMetrics.totalDelta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gamma Risk</span>
                      <span className="text-yellow-400 font-medium">
                        {portfolioMetrics.totalGamma.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Decay</span>
                      <span className="text-red-400 font-medium">
                        {portfolioMetrics.totalTheta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility Risk</span>
                      <span className="text-blue-400 font-medium">
                        {portfolioMetrics.totalVega.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Beta</span>
                      <span className="text-white font-medium">{portfolioMetrics.portfolioBeta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Risk</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.currentRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Risk</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.maxRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Utilization</span>
                      <span className="text-white font-medium">
                        {((portfolioMetrics.currentRisk / portfolioMetrics.maxRisk) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Trades</span>
                      <span className="text-white font-medium">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate</span>
                      <span className="text-green-400 font-medium">68.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Factor</span>
                      <span className="text-white font-medium">1.85</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-white font-medium">1.42</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-red-400 font-medium">3.2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Options Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg IV</span>
                      <span className="text-white font-medium">18.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IV Rank</span>
                      <span className="text-yellow-400 font-medium">65%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Put/Call Ratio</span>
                      <span className="text-white font-medium">0.85</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Skew</span>
                      <span className="text-white font-medium">-0.12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Term Structure</span>
                      <span className="text-white font-medium">Normal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Heat</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.currentRisk * 100).toFixed(1)}% / {(portfolioMetrics.maxRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Delta Exposure</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalDelta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gamma Risk</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalGamma.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Theta Decay</span>
                      <span className="text-red-400 font-medium">
                        {portfolioMetrics.totalTheta.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vega Risk</span>
                      <span className="text-white font-medium">
                        {portfolioMetrics.totalVega.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Risk Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Position Size</span>
                      <span className="text-white font-medium">2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Portfolio Heat</span>
                      <span className="text-white font-medium">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-white font-medium">5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consecutive Loss Limit</span>
                      <span className="text-white font-medium">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emergency Stop</span>
                      <span className="text-red-400 font-medium">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
