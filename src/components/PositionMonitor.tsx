'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowUpDown,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  Settings,
  Download
} from 'lucide-react';

interface PaperPosition {
  id: string;
  ticker: string;
  optionSymbol: string;
  contractType: 'CALL' | 'PUT';
  strike: number;
  expiration: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryTimestamp: string;
  pnl: number;
  pnlPercent: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  confidence: number;
  conviction: number;
  regime: string;
  daysToExpiration: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    impliedVolatility: number;
  };
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
}

type SortField = 'ticker' | 'pnl' | 'pnlPercent' | 'confidence' | 'daysToExpiration' | 'entryTimestamp';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  ticker: string;
  contractType: 'ALL' | 'CALL' | 'PUT';
  side: 'ALL' | 'LONG' | 'SHORT';
  regime: 'ALL' | 'BULL' | 'BEAR' | 'NEUTRAL';
  minPnL: string;
  maxPnL: string;
  minDTE: string;
  maxDTE: string;
}

export const PositionMonitor: React.FC = () => {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('pnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ticker: '',
    contractType: 'ALL',
    side: 'ALL',
    regime: 'ALL',
    minPnL: '',
    maxPnL: '',
    minDTE: '',
    maxDTE: ''
  });

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/paper/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      setLoading(false);
    }
  };

  const filteredAndSortedPositions = useMemo(() => {
    let filtered = positions.filter(position => {
      // Ticker filter
      if (filters.ticker && !position.ticker.toLowerCase().includes(filters.ticker.toLowerCase())) {
        return false;
      }

      // Contract type filter
      if (filters.contractType !== 'ALL' && position.contractType !== filters.contractType) {
        return false;
      }

      // Side filter
      if (filters.side !== 'ALL' && position.side !== filters.side) {
        return false;
      }

      // Regime filter
      if (filters.regime !== 'ALL' && position.regime !== filters.regime) {
        return false;
      }

      // PnL filters
      if (filters.minPnL && position.pnl < parseFloat(filters.minPnL)) {
        return false;
      }
      if (filters.maxPnL && position.pnl > parseFloat(filters.maxPnL)) {
        return false;
      }

      // Days to expiration filters
      if (filters.minDTE && position.daysToExpiration < parseInt(filters.minDTE)) {
        return false;
      }
      if (filters.maxDTE && position.daysToExpiration > parseInt(filters.maxDTE)) {
        return false;
      }

      return true;
    });

    // Sort positions
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'entryTimestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [positions, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      const response = await fetch(`/api/paper/positions/${positionId}/close`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchPositions(); // Refresh positions
      }
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  const handleAdjustStops = async (positionId: string, stopLoss: number, profitTarget: number) => {
    try {
      const response = await fetch(`/api/paper/positions/${positionId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopLoss, profitTarget })
      });
      
      if (response.ok) {
        fetchPositions(); // Refresh positions
      }
    } catch (error) {
      console.error('Failed to adjust stops:', error);
    }
  };

  const exportPositions = () => {
    const csv = [
      // Header
      'Ticker,Contract,Side,Quantity,Entry Price,Current Price,P&L,P&L %,Confidence,DTE,Delta,Theta',
      // Data
      ...filteredAndSortedPositions.map(p => 
        `${p.ticker},${p.optionSymbol},${p.side},${p.quantity},${p.entryPrice},${p.currentPrice},${p.pnl},${p.pnlPercent},${p.confidence},${p.daysToExpiration},${p.greeks.delta},${p.greeks.theta}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `positions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      ticker: '',
      contractType: 'ALL',
      side: 'ALL',
      regime: 'ALL',
      minPnL: '',
      maxPnL: '',
      minDTE: '',
      maxDTE: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDTEColor = (dte: number) => {
    if (dte <= 3) return 'destructive';
    if (dte <= 7) return 'secondary';
    return 'outline';
  };

  const openPositions = filteredAndSortedPositions.filter(p => p.status === 'OPEN');
  const totalPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <span>Position Monitor</span>
            <Badge variant="outline">
              {openPositions.length} positions • {formatCurrency(totalPnL)} P&L
            </Badge>
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPositions}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium">Ticker</label>
              <Input
                placeholder="Filter by ticker..."
                value={filters.ticker}
                onChange={(e) => setFilters(prev => ({ ...prev, ticker: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Contract Type</label>
              <Select
                value={filters.contractType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, contractType: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="CALL">Calls</SelectItem>
                  <SelectItem value="PUT">Puts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Side</label>
              <Select
                value={filters.side}
                onValueChange={(value) => setFilters(prev => ({ ...prev, side: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sides</SelectItem>
                  <SelectItem value="LONG">Long</SelectItem>
                  <SelectItem value="SHORT">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Regime</label>
              <Select
                value={filters.regime}
                onValueChange={(value) => setFilters(prev => ({ ...prev, regime: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Regimes</SelectItem>
                  <SelectItem value="BULL">Bull</SelectItem>
                  <SelectItem value="BEAR">Bear</SelectItem>
                  <SelectItem value="NEUTRAL">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="text-sm font-medium">Min P&L</label>
                <Input
                  type="number"
                  placeholder="Min P&L"
                  value={filters.minPnL}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPnL: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Max P&L</label>
                <Input
                  type="number"
                  placeholder="Max P&L"
                  value={filters.maxPnL}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPnL: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="text-sm font-medium">Min DTE</label>
                <Input
                  type="number"
                  placeholder="Min DTE"
                  value={filters.minDTE}
                  onChange={(e) => setFilters(prev => ({ ...prev, minDTE: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Max DTE</label>
                <Input
                  type="number"
                  placeholder="Max DTE"
                  value={filters.maxDTE}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxDTE: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading positions...</div>
        ) : openPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No open positions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('ticker')}
                  >
                    <div className="flex items-center">
                      Ticker
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead>Contract Details</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('pnl')}
                  >
                    <div className="flex items-center">
                      P&L
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('confidence')}
                  >
                    <div className="flex items-center">
                      Confidence
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead>Greeks</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('daysToExpiration')}
                  >
                    <div className="flex items-center">
                      DTE
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead>MFE/MAE</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((position) => (
                  <TableRow key={position.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <div>{position.ticker}</div>
                        <Badge variant="outline" className="text-xs">
                          {position.regime}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{position.optionSymbol}</div>
                        <div className="text-gray-500">
                          {position.contractType} ${position.strike}
                        </div>
                        <div className="text-xs text-gray-400">
                          Exp: {new Date(position.expiration).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={position.side === 'LONG' ? 'default' : 'secondary'}>
                        {position.side}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>{position.quantity}</TableCell>
                    
                    <TableCell>${position.entryPrice.toFixed(2)}</TableCell>
                    
                    <TableCell>${position.currentPrice.toFixed(2)}</TableCell>
                    
                    <TableCell className={getPnLColor(position.pnl)}>
                      <div className="font-medium">{formatCurrency(position.pnl)}</div>
                      <div className="text-sm">{formatPercent(position.pnlPercent)}</div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={position.confidence * 100} 
                          className="w-16 h-2"
                        />
                        <span className="text-sm">
                          {(position.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>Δ: {position.greeks.delta.toFixed(3)}</div>
                        <div>Γ: {position.greeks.gamma.toFixed(3)}</div>
                        <div>Θ: {position.greeks.theta.toFixed(3)}</div>
                        <div>ν: {position.greeks.vega.toFixed(3)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getDTEColor(position.daysToExpiration)}>
                        {position.daysToExpiration}d
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-xs">
                        <div className="text-green-600">
                          MFE: {formatCurrency(position.maxFavorableExcursion)}
                        </div>
                        <div className="text-red-600">
                          MAE: {formatCurrency(position.maxAdverseExcursion)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClosePosition(position.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Would open a modal for adjusting stops
                            console.log('Adjust stops for', position.id);
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};