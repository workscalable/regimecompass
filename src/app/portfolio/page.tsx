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
  Minus,
  PieChart,
  LineChart,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle,
  CheckCircle2,
  XCircle as XCircleIcon,
  Info,
  ExternalLink,
  Download,
  Upload,
  Filter,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { toast } from 'sonner';

interface Position {
  id: string;
  ticker: string;
  type: 'STOCK' | 'CALL' | 'PUT' | 'SPREAD' | 'STRADDLE' | 'STRANGLE';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  realizedPnL: number;
  daysHeld: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  entryDate: string;
  expiryDate?: string;
  strike?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  intrinsicValue?: number;
  timeValue?: number;
  moneyness?: 'ITM' | 'ATM' | 'OTM';
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  portfolioHeat: number;
  maxHeat: number;
  beta: number;
  correlation: number;
  var95: number;
  expectedShortfall: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingPeriod: number;
}

interface RiskMetrics {
  portfolioHeat: number;
  maxHeat: number;
  currentDrawdown: number;
  maxDrawdown: number;
  var95: number;
  expectedShortfall: number;
  beta: number;
  correlation: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export default function PortfolioManagementPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [selectedView, setSelectedView] = useState('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [sortBy, setSortBy] = useState('pnl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState('all');

  // Mock portfolio data
  const [positions, setPositions] = useState<Position[]>([
    {
      id: '1',
      ticker: 'SPY',
      type: 'CALL',
      quantity: 10,
      entryPrice: 2.45,
      currentPrice: 3.12,
      pnl: 670.00,
      pnlPercent: 27.35,
      marketValue: 3120.00,
      costBasis: 2450.00,
      unrealizedPnL: 670.00,
      realizedPnL: 0,
      daysHeld: 5,
      confidence: 0.89,
      riskLevel: 'MEDIUM',
      status: 'OPEN',
      entryDate: '2024-01-14',
      expiryDate: '2024-01-19',
      strike: 450,
      delta: 0.65,
      gamma: 0.02,
      theta: -0.15,
      vega: 0.08,
      rho: 0.03,
      intrinsicValue: 2.30,
      timeValue: 0.82,
      moneyness: 'ITM'
    },
    {
      id: '2',
      ticker: 'QQQ',
      type: 'PUT',
      quantity: 5,
      entryPrice: 1.80,
      currentPrice: 1.45,
      pnl: -175.00,
      pnlPercent: -19.44,
      marketValue: 725.00,
      costBasis: 900.00,
      unrealizedPnL: -175.00,
      realizedPnL: 0,
      daysHeld: 3,
      confidence: 0.72,
      riskLevel: 'HIGH',
      status: 'OPEN',
      entryDate: '2024-01-16',
      expiryDate: '2024-01-19',
      strike: 380,
      delta: -0.45,
      gamma: 0.03,
      theta: -0.12,
      vega: 0.06,
      rho: -0.02,
      intrinsicValue: 0.80,
      timeValue: 0.65,
      moneyness: 'OTM'
    },
    {
      id: '3',
      ticker: 'AAPL',
      type: 'STOCK',
      quantity: 100,
      entryPrice: 185.50,
      currentPrice: 192.30,
      pnl: 680.00,
      pnlPercent: 3.67,
      marketValue: 19230.00,
      costBasis: 18550.00,
      unrealizedPnL: 680.00,
      realizedPnL: 0,
      daysHeld: 12,
      confidence: 0.85,
      riskLevel: 'LOW',
      status: 'OPEN',
      entryDate: '2024-01-07'
    }
  ]);

  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics>({
    totalValue: 125000,
    totalCost: 120000,
    totalPnL: 5000,
    totalPnLPercent: 4.17,
    dailyPnL: 1250,
    dailyPnLPercent: 1.01,
    unrealizedPnL: 5000,
    realizedPnL: 0,
    winRate: 0.68,
    profitFactor: 1.85,
    sharpeRatio: 1.42,
    maxDrawdown: 0.03,
    currentDrawdown: 0.01,
    portfolioHeat: 0.12,
    maxHeat: 0.20,
    beta: 0.95,
    correlation: 0.78,
    var95: 850,
    expectedShortfall: 1200,
    consecutiveWins: 4,
    consecutiveLosses: 0,
    totalTrades: 156,
    winningTrades: 106,
    losingTrades: 50,
    avgWin: 245.50,
    avgLoss: -180.25,
    bestTrade: 1250.00,
    worstTrade: -450.00,
    avgHoldingPeriod: 2.3
  });

  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioHeat: 0.12,
    maxHeat: 0.20,
    currentDrawdown: 0.01,
    maxDrawdown: 0.03,
    var95: 850,
    expectedShortfall: 1200,
    beta: 0.95,
    correlation: 0.78,
    volatility: 0.18,
    sharpeRatio: 1.42,
    sortinoRatio: 1.85,
    calmarRatio: 1.39,
    riskScore: 0.72,
    riskLevel: 'MEDIUM'
  });

  const [performanceHistory, setPerformanceHistory] = useState([
    { date: '2024-01-01', value: 120000, pnl: 0 },
    { date: '2024-01-02', value: 121500, pnl: 1500 },
    { date: '2024-01-03', value: 119800, pnl: -200 },
    { date: '2024-01-04', value: 122300, pnl: 2500 },
    { date: '2024-01-05', value: 123800, pnl: 3800 },
    { date: '2024-01-08', value: 122100, pnl: 2100 },
    { date: '2024-01-09', value: 124500, pnl: 4500 },
    { date: '2024-01-10', value: 125000, pnl: 5000 }
  ]);

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-400 bg-green-900/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20';
      case 'HIGH': return 'text-red-400 bg-red-900/20';
      case 'CRITICAL': return 'text-red-600 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-400 bg-green-900/20';
      case 'CLOSED': return 'text-gray-400 bg-gray-900/20';
      case 'EXPIRED': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STOCK': return 'text-blue-400 bg-blue-900/20';
      case 'CALL': return 'text-green-400 bg-green-900/20';
      case 'PUT': return 'text-red-400 bg-red-900/20';
      case 'SPREAD': return 'text-purple-400 bg-purple-900/20';
      case 'STRADDLE': return 'text-yellow-400 bg-yellow-900/20';
      case 'STRANGLE': return 'text-orange-400 bg-orange-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMoneynessColor = (moneyness?: string) => {
    if (!moneyness) return 'text-gray-400 bg-gray-900/20';
    switch (moneyness) {
      case 'ITM': return 'text-green-400 bg-green-900/20';
      case 'ATM': return 'text-yellow-400 bg-yellow-900/20';
      case 'OTM': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const sortedPositions = [...positions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'pnl':
        aValue = a.pnl;
        bValue = b.pnl;
        break;
      case 'pnlPercent':
        aValue = a.pnlPercent;
        bValue = b.pnlPercent;
        break;
      case 'marketValue':
        aValue = a.marketValue;
        bValue = b.marketValue;
        break;
      case 'confidence':
        aValue = a.confidence;
        bValue = b.confidence;
        break;
      case 'daysHeld':
        aValue = a.daysHeld;
        bValue = b.daysHeld;
        break;
      default:
        aValue = a.pnl;
        bValue = b.pnl;
    }
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const filteredPositions = sortedPositions.filter(position => {
    if (filterBy === 'all') return true;
    if (filterBy === 'winners') return position.pnl > 0;
    if (filterBy === 'losers') return position.pnl < 0;
    if (filterBy === 'options') return position.type !== 'STOCK';
    if (filterBy === 'stocks') return position.type === 'STOCK';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <PieChart className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold">Portfolio Management</h1>
              </div>
              <Badge className="bg-blue-900/20 text-blue-400 px-3 py-1">
                ${portfolioMetrics.totalValue.toLocaleString()}
              </Badge>
              <Badge className={`${getPnLColor(portfolioMetrics.totalPnL)} bg-gray-900/20 px-3 py-1`}>
                {portfolioMetrics.totalPnL > 0 ? '+' : ''}${portfolioMetrics.totalPnL.toLocaleString()}
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Positions</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <LineChart className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Risk</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    ${portfolioMetrics.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    Cost: ${portfolioMetrics.totalCost.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold mb-1 ${getPnLColor(portfolioMetrics.totalPnL)}`}>
                    {portfolioMetrics.totalPnL > 0 ? '+' : ''}${portfolioMetrics.totalPnL.toLocaleString()}
                  </div>
                  <div className={`text-sm ${getPnLColor(portfolioMetrics.totalPnLPercent)}`}>
                    {portfolioMetrics.totalPnLPercent > 0 ? '+' : ''}{portfolioMetrics.totalPnLPercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Daily P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold mb-1 ${getPnLColor(portfolioMetrics.dailyPnL)}`}>
                    {portfolioMetrics.dailyPnL > 0 ? '+' : ''}${portfolioMetrics.dailyPnL.toLocaleString()}
                  </div>
                  <div className={`text-sm ${getPnLColor(portfolioMetrics.dailyPnLPercent)}`}>
                    {portfolioMetrics.dailyPnLPercent > 0 ? '+' : ''}{portfolioMetrics.dailyPnLPercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    {(portfolioMetrics.winRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    {portfolioMetrics.winningTrades}W / {portfolioMetrics.losingTrades}L
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Factor</span>
                      <span className="text-white font-medium">{portfolioMetrics.profitFactor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-white font-medium">{portfolioMetrics.sharpeRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-red-400 font-medium">
                        {(portfolioMetrics.maxDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Drawdown</span>
                      <span className="text-white font-medium">
                        {(portfolioMetrics.currentDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Heat</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.portfolioHeat * 100).toFixed(1)}% / {(riskMetrics.maxHeat * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Beta</span>
                      <span className="text-white font-medium">{riskMetrics.beta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VaR (95%)</span>
                      <span className="text-white font-medium">${riskMetrics.var95.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Level</span>
                      <Badge className={getRiskLevelColor(riskMetrics.riskLevel)}>
                        {riskMetrics.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Trades</span>
                      <span className="text-white font-medium">{portfolioMetrics.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Win</span>
                      <span className="text-green-400 font-medium">${portfolioMetrics.avgWin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Loss</span>
                      <span className="text-red-400 font-medium">${portfolioMetrics.avgLoss}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Holding Period</span>
                      <span className="text-white font-medium">{portfolioMetrics.avgHoldingPeriod} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions" className="space-y-6">
            {/* Filters and Controls */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Position Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="filter">Filter By</Label>
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="winners">Winners</SelectItem>
                        <SelectItem value="losers">Losers</SelectItem>
                        <SelectItem value="options">Options Only</SelectItem>
                        <SelectItem value="stocks">Stocks Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sort">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pnl">P&L</SelectItem>
                        <SelectItem value="pnlPercent">P&L %</SelectItem>
                        <SelectItem value="marketValue">Market Value</SelectItem>
                        <SelectItem value="confidence">Confidence</SelectItem>
                        <SelectItem value="daysHeld">Days Held</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="order">Order</Label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Positions Table */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Positions ({filteredPositions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Ticker</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Quantity</th>
                        <th className="text-left py-3 px-4">Entry</th>
                        <th className="text-left py-3 px-4">Current</th>
                        <th className="text-left py-3 px-4">P&L</th>
                        <th className="text-left py-3 px-4">P&L %</th>
                        <th className="text-left py-3 px-4">Market Value</th>
                        <th className="text-left py-3 px-4">Days Held</th>
                        <th className="text-left py-3 px-4">Confidence</th>
                        <th className="text-left py-3 px-4">Risk</th>
                        <th className="text-left py-3 px-4">Status</th>
                        {showAdvanced && (
                          <>
                            <th className="text-left py-3 px-4">Delta</th>
                            <th className="text-left py-3 px-4">Gamma</th>
                            <th className="text-left py-3 px-4">Theta</th>
                            <th className="text-left py-3 px-4">Vega</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.map((position) => (
                        <tr key={position.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-3 px-4 font-medium">{position.ticker}</td>
                          <td className="py-3 px-4">
                            <Badge className={getTypeColor(position.type)}>
                              {position.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{position.quantity}</td>
                          <td className="py-3 px-4">${position.entryPrice.toFixed(2)}</td>
                          <td className="py-3 px-4">${position.currentPrice.toFixed(2)}</td>
                          <td className={`py-3 px-4 font-medium ${getPnLColor(position.pnl)}`}>
                            {position.pnl > 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          </td>
                          <td className={`py-3 px-4 ${getPnLColor(position.pnlPercent)}`}>
                            {position.pnlPercent > 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4">${position.marketValue.toLocaleString()}</td>
                          <td className="py-3 px-4">{position.daysHeld}</td>
                          <td className="py-3 px-4">
                            <Badge className={getConfidenceColor(position.confidence)}>
                              {(position.confidence * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getRiskLevelColor(position.riskLevel)}>
                              {position.riskLevel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(position.status)}>
                              {position.status}
                            </Badge>
                          </td>
                          {showAdvanced && position.delta !== undefined && (
                            <>
                              <td className="py-3 px-4">{position.delta?.toFixed(3)}</td>
                              <td className="py-3 px-4">{position.gamma?.toFixed(3)}</td>
                              <td className="py-3 px-4">{position.theta?.toFixed(3)}</td>
                              <td className="py-3 px-4">{position.vega?.toFixed(3)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Performance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceHistory.map((day, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                        <div>
                          <div className="text-sm text-gray-400">{day.date}</div>
                          <div className="text-white font-medium">${day.value.toLocaleString()}</div>
                        </div>
                        <div className={`text-right ${getPnLColor(day.pnl)}`}>
                          <div className="font-medium">
                            {day.pnl > 0 ? '+' : ''}${day.pnl.toLocaleString()}
                          </div>
                          <div className="text-sm">
                            {day.pnl > 0 ? '+' : ''}{((day.pnl / (day.value - day.pnl)) * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Best Trade</span>
                      <span className="text-green-400 font-medium">${portfolioMetrics.bestTrade.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Worst Trade</span>
                      <span className="text-red-400 font-medium">${portfolioMetrics.worstTrade.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consecutive Wins</span>
                      <span className="text-green-400 font-medium">{portfolioMetrics.consecutiveWins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consecutive Losses</span>
                      <span className="text-red-400 font-medium">{portfolioMetrics.consecutiveLosses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Holding Period</span>
                      <span className="text-white font-medium">{portfolioMetrics.avgHoldingPeriod} days</span>
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
                  <CardTitle className="text-xl">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Heat</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.portfolioHeat * 100).toFixed(1)}% / {(riskMetrics.maxHeat * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Drawdown</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.currentDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-red-400 font-medium">
                        {(riskMetrics.maxDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VaR (95%)</span>
                      <span className="text-white font-medium">${riskMetrics.var95.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected Shortfall</span>
                      <span className="text-white font-medium">${riskMetrics.expectedShortfall.toLocaleString()}</span>
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
                      <span className="text-gray-400">Risk Level</span>
                      <Badge className={getRiskLevelColor(riskMetrics.riskLevel)}>
                        {riskMetrics.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Score</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.riskScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Beta</span>
                      <span className="text-white font-medium">{riskMetrics.beta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.volatility * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-white font-medium">{riskMetrics.sharpeRatio}</span>
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
                  <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sortino Ratio</span>
                      <span className="text-white font-medium">{riskMetrics.sortinoRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Calmar Ratio</span>
                      <span className="text-white font-medium">{riskMetrics.calmarRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Correlation</span>
                      <span className="text-white font-medium">{riskMetrics.correlation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.volatility * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Performance Attribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Unrealized P&L</span>
                      <span className="text-white font-medium">
                        ${portfolioMetrics.unrealizedPnL.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Realized P&L</span>
                      <span className="text-white font-medium">
                        ${portfolioMetrics.realizedPnL.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Cost</span>
                      <span className="text-white font-medium">
                        ${portfolioMetrics.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Value</span>
                      <span className="text-white font-medium">
                        ${portfolioMetrics.totalValue.toLocaleString()}
                      </span>
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
