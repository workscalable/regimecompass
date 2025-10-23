import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectorHeatmap from '@/components/SectorHeatmap';

// Mock the fetch function
global.fetch = jest.fn();

const mockSectorData = {
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
  },
  XLF: {
    symbol: 'XLF',
    name: 'Financial Select Sector SPDR Fund',
    price: 40,
    change: 0.4,
    changePercent: 1.0,
    volume: 20000000,
    trendScore9: 3,
    relativeStrength: 0.2,
    recommendation: 'HOLD',
    timestamp: new Date().toISOString()
  },
  XLE: {
    symbol: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    price: 85,
    change: -1.7,
    changePercent: -2.0,
    volume: 12000000,
    trendScore9: -4,
    relativeStrength: -0.8,
    recommendation: 'AVOID',
    timestamp: new Date().toISOString()
  },
  XLV: {
    symbol: 'XLV',
    name: 'Health Care Select Sector SPDR Fund',
    price: 130,
    change: 0.65,
    changePercent: 0.5,
    volume: 8000000,
    trendScore9: 2,
    relativeStrength: 0.1,
    recommendation: 'HOLD',
    timestamp: new Date().toISOString()
  }
};

describe('SectorHeatmap Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          sectors: mockSectorData,
          timestamp: new Date().toISOString()
        }
      })
    });
  });

  it('should render loading state initially', () => {
    render(<SectorHeatmap />);
    
    expect(screen.getByText('Loading sector data...')).toBeInTheDocument();
  });

  it('should display sector tiles after loading', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });
    
    expect(screen.getByText('XLF')).toBeInTheDocument();
    expect(screen.getByText('XLE')).toBeInTheDocument();
    expect(screen.getByText('XLV')).toBeInTheDocument();
  });

  it('should display sector names and performance', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('Technology Select Sector SPDR Fund')).toBeInTheDocument();
    });
    
    expect(screen.getByText('+1.0%')).toBeInTheDocument(); // XLK performance
    expect(screen.getByText('-2.0%')).toBeInTheDocument(); // XLE performance
  });

  it('should apply correct color coding based on performance', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      const xlkTile = screen.getByTestId('sector-tile-XLK');
      expect(xlkTile).toHaveClass('heatmap-strong'); // Positive performance
    });
    
    const xleTile = screen.getByTestId('sector-tile-XLE');
    expect(xleTile).toHaveClass('heatmap-weak'); // Negative performance
  });

  it('should show trend scores correctly', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('Trend: +6')).toBeInTheDocument(); // XLK trend score
    });
    
    expect(screen.getByText('Trend: -4')).toBeInTheDocument(); // XLE trend score
  });

  it('should display recommendations', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('BUY')).toBeInTheDocument(); // XLK recommendation
    });
    
    expect(screen.getByText('AVOID')).toBeInTheDocument(); // XLE recommendation
    expect(screen.getAllByText('HOLD')).toHaveLength(2); // XLF and XLV
  });

  it('should handle sector tile clicks', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    const xlkTile = screen.getByTestId('sector-tile-XLK');
    await user.click(xlkTile);
    
    // Should show detailed sector information
    expect(screen.getByText('Sector Details')).toBeInTheDocument();
    expect(screen.getByText('Technology Select Sector SPDR Fund')).toBeInTheDocument();
  });

  it('should show sector rotation signals', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('Sector Rotation')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Leading Sectors')).toBeInTheDocument();
    expect(screen.getByText('Lagging Sectors')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('should filter sectors by performance', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    // Filter to show only strong sectors
    const strongFilter = screen.getByRole('button', { name: /strong/i });
    await user.click(strongFilter);
    
    expect(screen.getByText('XLK')).toBeInTheDocument();
    expect(screen.queryByText('XLE')).not.toBeInTheDocument();
  });

  it('should sort sectors by different criteria', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    // Sort by trend score
    const sortButton = screen.getByRole('button', { name: /sort by trend/i });
    await user.click(sortButton);
    
    // Verify sectors are reordered (XLK should be first with trend score +6)
    const sectorTiles = screen.getAllByTestId(/sector-tile-/);
    expect(sectorTiles[0]).toHaveAttribute('data-testid', 'sector-tile-XLK');
  });

  it('should show tooltips on hover', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    const xlkTile = screen.getByTestId('sector-tile-XLK');
    await user.hover(xlkTile);
    
    await waitFor(() => {
      expect(screen.getByText('Relative Strength: 0.5')).toBeInTheDocument();
    });
  });

  it('should be responsive to different screen sizes', async () => {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    const heatmapGrid = screen.getByTestId('heatmap-grid');
    expect(heatmapGrid).toHaveClass('grid-cols-2'); // Mobile layout
  });

  it('should handle empty sector data', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          sectors: {},
          timestamp: new Date().toISOString()
        }
      })
    });

    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('No sector data available')).toBeInTheDocument();
    });
  });

  it('should show allocation recommendations', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('Allocation Recommendations')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Overweight')).toBeInTheDocument();
    expect(screen.getByText('Underweight')).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    // Check for proper ARIA labels
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(4);
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SectorHeatmap />);
    
    await waitFor(() => {
      expect(screen.getByText('XLK')).toBeInTheDocument();
    });

    // Test arrow key navigation
    const firstTile = screen.getByTestId('sector-tile-XLK');
    firstTile.focus();
    
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('sector-tile-XLF')).toHaveFocus();
  });
});