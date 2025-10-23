'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Target,
  AlertTriangle
} from 'lucide-react';

interface PerformanceData {
  date: string;
  accountBalance: number;
  totalPnL: number;
  dailyPnL: number;
  drawdown: number;
  winRate: number;
  trades: number;
}

interface TradeData {
  id: string;
  ticker: string;
  entryDate: string;
  exitDate: string;
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number;
  confidence: number;
  contractType: 'CALL' | 'PUT';
  regime: string;
  exitReason: string;
}

interface BenchmarkData {
  date: string;
  strategy: number;
  spy: number;
  qqq: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PerformanceAnalytics: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [tradeData, setTradeData] = useState<TradeData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      const [performanceRes, tradesRes, benchmarkRes] = await Promise.all([
        fetch(`/api/paper/analytics/performance?timeframe=${timeframe}`),
        fetch(`/api/paper/analytics/trades?timeframe=${timeframe}`),
        fetch(`/api/paper/analytics/benchmark?timeframe=${timeframe}`)
      ]);

      if (performanceRes.ok) {
        const data = await performanceRes.json();
        setPerformanceData(data);
      }

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTradeData(data);
      }

      if (benchmarkRes.ok) {
        const data = await benchmarkRes.json();
        setBenchmarkData(data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setLoading(false);
    }
  };

  // Calculate summary metrics
  const latestPerformance = performanceData[performanceData.length - 1];
  const totalReturn = latestPerformance ? 
    ((latestPerformance.accountBalance - 100000) / 100000) * 100 : 0;
  const maxDrawdown = Math.max(...performanceData.map(d => d.drawdown), 0);
  const avgWinRate = performanceData.length > 0 ? 
    performanceData.reduce((sum, d) => sum + d.winRate, 0) / performanceData.length : 0;

  // Trade analysis
  const winningTrades = tradeData.filter(t => t.pnl > 0);
  const losingTrades = tradeData.filter(t => t.pnl < 0);
  const winRate = tradeData.length > 0 ? (winningTrades.length / tradeData.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? 
    winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? 
    losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  // Sector breakdown
  const sectorBreakdown = tradeData.reduce((acc, trade) => {
    const sector = trade.ticker; // Simplified - would map to actual sectors
    acc[sector] = (acc[sector] || 0) + trade.pnl;
    return acc;
  }, {} as Record<string, number>);

  const sectorData = Object.entries(sectorBreakdown).map(([sector, pnl]) => ({
    name: sector,
    value: pnl,
    count: tradeData.filter(t => t.ticker === sector).length
  }));

  // Contract type breakdown
  const contractTypeData = [
    {
      name: 'CALL',
      value: tradeData.filter(t => t.contractType === 'CALL').reduce((sum, t) => sum + t.pnl, 0),
      count: tradeData.filter(t => t.contractType === 'CALL').length
    },
    {
      name: 'PUT',
      value: tradeData.filter(t => t.contractType === 'PUT').reduce((sum, t) => sum + t.pnl, 0),
      count: tradeData.filter(t => t.contractType === 'PUT').length
    }
  ];

  // Monthly performance
  const monthlyData = performanceData.reduce((acc, data) => {
    const month = new Date(data.date).toISOString().slice(0, 7);
    if (!acc[month]) {
      acc[month] = { month, pnl: 0, trades: 0 };
    }
    acc[month].pnl += data.dailyPnL;
    acc[month].trades += data.trades;
    return acc;
  }, {} as Record<string, { month: string; pnl: number; trades: number }>);

  const monthlyPerformance = Object.values(monthlyData);

  const exportData = () => {
    const csvData = [
      'Date,Account Balance,Total PnL,Daily PnL,Drawdown,Win Rate,Trades',
      ...performanceData.map(d => 
        `${d.date},${d.accountBalance},${d.totalPnL},${d.dailyPnL},${d.drawdown},${d.winRate},${d.trades}`
      )
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading performance analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Performance Analytics</h2>
        <div className="flex space-x-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Return</p>
                <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(totalReturn)}
                </p>
              </div>
              {totalReturn >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">{tradeData.length} trades</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profit Factor</p>
                <p className="text-2xl font-bold">{profitFactor.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  Avg Win: {formatCurrency(avgWin)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatPercent(maxDrawdown)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="equity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equity">Equity Curve</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
          <TabsTrigger value="monthly">Monthly P&L</TabsTrigger>
          <TabsTrigger value="breakdown">Trade Breakdown</TabsTrigger>
          <TabsTrigger value="benchmark">vs Benchmark</TabsTrigger>
        </TabsList>

        {/* Equity Curve */}
        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle>Account Balance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accountBalance" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drawdown Chart */}
        <TabsContent value="drawdown">
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="#FF8042" 
                    fill="#FF8042"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Performance */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'P&L']}
                  />
                  <Bar 
                    dataKey="pnl" 
                    fill={(entry: any) => entry.pnl >= 0 ? '#00C49F' : '#FF8042'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>P&L by Ticker</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Calls vs Puts Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contractTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        formatCurrency(value), 
                        `${name} P&L (${props.payload.count} trades)`
                      ]}
                    />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Benchmark Comparison */}
        <TabsContent value="benchmark">
          <Card>
            <CardHeader>
              <CardTitle>Strategy vs Benchmark Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={benchmarkData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="strategy" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    name="Strategy"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spy" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="SPY"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="qqq" 
                    stroke="#FFBB28" 
                    strokeWidth={2}
                    name="QQQ"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trade Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Ticker</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Entry</th>
                  <th className="text-left p-2">Exit</th>
                  <th className="text-left p-2">P&L</th>
                  <th className="text-left p-2">Hold Period</th>
                  <th className="text-left p-2">Confidence</th>
                  <th className="text-left p-2">Exit Reason</th>
                </tr>
              </thead>
              <tbody>
                {tradeData.slice(-10).map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{trade.ticker}</td>
                    <td className="p-2">
                      <Badge variant={trade.contractType === 'CALL' ? 'default' : 'secondary'}>
                        {trade.contractType}
                      </Badge>
                    </td>
                    <td className="p-2">{new Date(trade.entryDate).toLocaleDateString()}</td>
                    <td className="p-2">{new Date(trade.exitDate).toLocaleDateString()}</td>
                    <td className={`p-2 font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(trade.pnl)}
                    </td>
                    <td className="p-2">{trade.holdingPeriod.toFixed(1)}h</td>
                    <td className="p-2">{(trade.confidence * 100).toFixed(0)}%</td>
                    <td className="p-2">
                      <Badge variant="outline">{trade.exitReason}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};