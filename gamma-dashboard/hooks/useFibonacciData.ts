import { useState, useEffect } from 'react';

interface FibonacciLevel {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  strength: number;
  distance: number;
}

interface FibonacciZoneData {
  ticker: string;
  currentPrice: number;
  zone: 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
  expansionLevel: number;
  keyLevels: FibonacciLevel[];
  confluence: number;
  zoneMultiplier: number;
  riskAdjustment: number;
  targets: {
    immediate: number;
    intermediate: number;
    extended: number;
  };
}

export const useFibonacciData = () => {
  const [fibonacciData, setFibonacciData] = useState<FibonacciZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateMockFibonacciData = (): FibonacciZoneData[] => {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX'];
    const zones = ['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'] as const;
    
    return tickers.map(ticker => {
      const basePrice = Math.random() * 400 + 100; // Random price between 100-500
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const expansionLevel = Math.random();
      const confluence = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
      
      // Zone multiplier based on zone type
      const zoneMultipliers = {
        'COMPRESSION': 1.2,
        'MID_EXPANSION': 1.0,
        'FULL_EXPANSION': 0.8,
        'OVER_EXTENSION': 0.4,
        'EXHAUSTION': 0.0
      };

      const generateLevels = (price: number, type: 'SUPPORT' | 'RESISTANCE' | 'TARGET', count: number): FibonacciLevel[] => {
        return Array.from({ length: count }, (_, i) => ({
          level: type === 'SUPPORT' 
            ? price * (0.95 - (i * 0.02)) 
            : type === 'RESISTANCE' 
              ? price * (1.05 + (i * 0.02))
              : price * (1.1 + (i * 0.05)),
          type,
          strength: Math.random() * 0.8 + 0.2,
          distance: Math.random() * 10 + 1
        }));
      };

      const supportLevels = generateLevels(basePrice, 'SUPPORT', 3);
      const resistanceLevels = generateLevels(basePrice, 'RESISTANCE', 3);
      const targetLevels = generateLevels(basePrice, 'TARGET', 2);

      return {
        ticker,
        currentPrice: basePrice,
        zone,
        expansionLevel,
        keyLevels: [...supportLevels, ...resistanceLevels, ...targetLevels],
        confluence,
        zoneMultiplier: zoneMultipliers[zone],
        riskAdjustment: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        targets: {
          immediate: basePrice * (1 + Math.random() * 0.05),
          intermediate: basePrice * (1 + Math.random() * 0.1 + 0.05),
          extended: basePrice * (1 + Math.random() * 0.15 + 0.1)
        }
      };
    });
  };

  const fetchFibonacciData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch from the API
      // const response = await fetch('/api/fibonacci-analysis');
      // const data = await response.json();
      
      // For now, use mock data
      const mockData = generateMockFibonacciData();
      setFibonacciData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Fibonacci data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFibonacciData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchFibonacciData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    fibonacciData,
    loading,
    error,
    refetch: fetchFibonacciData
  };
};