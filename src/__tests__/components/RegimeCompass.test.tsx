import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegimeCompass from '@/components/RegimeCompass';

// Mock the fetch function
global.fetch = jest.fn();

const mockMarketSnapshot = {
  timestamp: new Date().toISOString(),
  regime: 'BULL',
  indexes: {
    SPY: {
      symbol: 'SPY',
      price: 450,
      change: 2.5,
      changePercent: 0.56,
      volume: 50000000,
      ema20: 448,
      ema50: 445,
      trendScore9: 5,
      atr14: 9.2,
      timestamp: new Date().toISOString()
    }
  },
  sectors: {
    XLK: {
      symbol: 'XLK',
      name: 'Technology Select Sector SPDR Fund',
      price: 180,
      change: 1.8,
      changePercent: 1.0,
      volume: 15000000,
      trendScore9: 6,
      relativeStrength: 0.5,
      recommendation: 'BUY',
      timestamp: new Date().toISOString()
    }
  },
  breadth: {
    breadthPct: 0.65,
    advancingStocks: 325,
    decliningStocks: 175,
    unchangedStocks: 0,
    newHighs: 45,
    newLows: 12,
    advanceDeclineRatio: 1.86
  },
  vix: {
    value: 18.5,
    change: -0.8,
    changePercent: -4.1,
    trend: 'falling',
    fiveDayChange: -2.3,
    timestamp: new Date().toISOString()
  },
  gamma: {
    gex: -500000000,
    zeroGammaDist: 0.008,
    gammaFlip: 448,
    bias: 'supportive',
    timestamp: new Date().toISOString()
  },
  derivedSignals: {
    regimeStrength: 75,
    volatilityTrend: 'falling',
    breadthMomentum: 'improving'
  }
};

describe('RegimeCompass Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockMarketSnapshot,
        timestamp: new Date().toISOString()
      })
    });
  });

  it('should render loading state initially', () => {
    render(<RegimeCompass />);
    
    expect(screen.getByText('Loading market data...')).toBeInTheDocument();
  });

  it('should display regime status after loading', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('BULL')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Current Market Regime')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // Regime strength
  });

  it('should display market metrics correctly', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('SPY: $450.00')).toBeInTheDocument();
    });
    
    expect(screen.getByText('VIX: 18.5')).toBeInTheDocument();
    expect(screen.getByText('Breadth: 65.0%')).toBeInTheDocument();
  });

  it('should show different colors for different regimes', async () => {
    // Test BULL regime
    render(<RegimeCompass />);
    
    await waitFor(() => {
      const regimeElement = screen.getByText('BULL');
      expect(regimeElement).toHaveClass('regime-bull');
    });
  });

  it('should handle BEAR regime correctly', async () => {
    const bearSnapshot = {
      ...mockMarketSnapshot,
      regime: 'BEAR',
      derivedSignals: {
        ...mockMarketSnapshot.derivedSignals,
        regimeStrength: 25
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: bearSnapshot,
        timestamp: new Date().toISOString()
      })
    });

    render(<RegimeCompass />);
    
    await waitFor(() => {
      const regimeElement = screen.getByText('BEAR');
      expect(regimeElement).toHaveClass('regime-bear');
    });
  });

  it('should handle NEUTRAL regime correctly', async () => {
    const neutralSnapshot = {
      ...mockMarketSnapshot,
      regime: 'NEUTRAL',
      derivedSignals: {
        ...mockMarketSnapshot.derivedSignals,
        regimeStrength: 50
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: neutralSnapshot,
        timestamp: new Date().toISOString()
      })
    });

    render(<RegimeCompass />);
    
    await waitFor(() => {
      const regimeElement = screen.getByText('NEUTRAL');
      expect(regimeElement).toHaveClass('regime-neutral');
    });
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid API response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Internal server error'
      })
    });

    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('BULL')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('should display timestamp correctly', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });

  it('should show regime factors breakdown', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('Regime Factors')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Breadth')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('Volatility')).toBeInTheDocument();
  });

  it('should handle real-time updates', async () => {
    const { rerender } = render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('BULL')).toBeInTheDocument();
    });

    // Simulate data update
    const updatedSnapshot = {
      ...mockMarketSnapshot,
      regime: 'NEUTRAL',
      derivedSignals: {
        ...mockMarketSnapshot.derivedSignals,
        regimeStrength: 45
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: updatedSnapshot,
        timestamp: new Date().toISOString()
      })
    });

    rerender(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('NEUTRAL')).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('BULL')).toBeInTheDocument();
    });

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText(/current regime/i)).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('BULL')).toBeInTheDocument();
    });

    // Test tab navigation
    await user.tab();
    expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();
  });

  it('should display performance metrics', async () => {
    render(<RegimeCompass />);
    
    await waitFor(() => {
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });
    
    expect(screen.getByText('+0.56%')).toBeInTheDocument(); // SPY change
    expect(screen.getByText('Volume: 50.0M')).toBeInTheDocument();
  });
});