import { useState, useEffect, useCallback, useRef } from 'react';
import { TickerState } from '../components/TickerStateDashboard';

/**
 * Real-Time Data Hook
 * 
 * Manages WebSocket connections for real-time ticker state updates:
 * - Automatic connection management and reconnection
 * - Real-time state transitions and confidence updates
 * - Connection status monitoring
 * - Error handling and recovery
 */

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface RealTimeDataHook {
  tickers: TickerState[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribeToTicker: (symbol: string) => void;
  unsubscribeFromTicker: (symbol: string) => void;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
};

export const useRealTimeData = (config: Partial<WebSocketConfig> = {}): RealTimeDataHook => {
  const wsConfig = { ...DEFAULT_CONFIG, ...config };
  
  // State
  const [tickers, setTickers] = useState<TickerState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedTickersRef = useRef<Set<string>>(new Set());

  // Clear timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
      
      heartbeatTimeoutRef.current = setTimeout(() => {
        sendHeartbeat();
      }, wsConfig.heartbeatInterval);
    }
  }, [wsConfig.heartbeatInterval]);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ticker_update':
          setTickers(prevTickers => {
            const existingIndex = prevTickers.findIndex(t => t.symbol === data.ticker.symbol);
            
            if (existingIndex >= 0) {
              // Update existing ticker
              const updatedTickers = [...prevTickers];
              updatedTickers[existingIndex] = {
                ...updatedTickers[existingIndex],
                ...data.ticker,
                lastUpdate: new Date(data.ticker.lastUpdate)
              };
              return updatedTickers;
            } else {
              // Add new ticker
              return [...prevTickers, {
                ...data.ticker,
                lastUpdate: new Date(data.ticker.lastUpdate)
              }];
            }
          });
          setLastUpdate(new Date());
          break;
          
        case 'state_transition':
          setTickers(prevTickers => {
            return prevTickers.map(ticker => {
              if (ticker.symbol === data.symbol) {
                return {
                  ...ticker,
                  state: data.newState,
                  confidence: data.confidence,
                  stateHistory: [
                    ...ticker.stateHistory,
                    {
                      state: data.newState,
                      timestamp: new Date(data.timestamp),
                      confidence: data.confidence,
                      reason: data.reason
                    }
                  ].slice(-20), // Keep last 20 state changes
                  lastUpdate: new Date()
                };
              }
              return ticker;
            });
          });
          setLastUpdate(new Date());
          break;
          
        case 'alert':
          setTickers(prevTickers => {
            return prevTickers.map(ticker => {
              if (ticker.symbol === data.symbol) {
                return {
                  ...ticker,
                  alerts: [
                    ...ticker.alerts,
                    {
                      type: data.alert.type,
                      message: data.alert.message,
                      timestamp: new Date(data.alert.timestamp)
                    }
                  ].slice(-10), // Keep last 10 alerts
                  lastUpdate: new Date()
                };
              }
              return ticker;
            });
          });
          break;
          
        case 'pong':
          // Heartbeat response - connection is alive
          break;
          
        case 'error':
          setError(data.message);
          console.error('WebSocket error:', data.message);
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
      setError('Failed to parse server message');
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    clearTimeouts();
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      wsRef.current = new WebSocket(wsConfig.url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start heartbeat
        sendHeartbeat();
        
        // Resubscribe to tickers
        subscribedTickersRef.current.forEach(symbol => {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbol
          }));
        });
      };
      
      wsRef.current.onmessage = handleMessage;
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        clearTimeouts();
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < wsConfig.maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${wsConfig.maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, wsConfig.reconnectInterval);
        } else if (reconnectAttemptsRef.current >= wsConfig.maxReconnectAttempts) {
          setConnectionStatus('error');
          setError('Max reconnection attempts reached');
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };
      
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionStatus('error');
      setError('Failed to create WebSocket connection');
    }
  }, [wsConfig, handleMessage, sendHeartbeat, clearTimeouts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [clearTimeouts]);

  // Subscribe to ticker updates
  const subscribeToTicker = useCallback((symbol: string) => {
    subscribedTickersRef.current.add(symbol);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbol
      }));
    }
  }, []);

  // Unsubscribe from ticker updates
  const unsubscribeFromTicker = useCallback((symbol: string) => {
    subscribedTickersRef.current.delete(symbol);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbol
      }));
    }
    
    // Remove ticker from state
    setTickers(prevTickers => prevTickers.filter(t => t.symbol !== symbol));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, [clearTimeouts]);

  return {
    tickers,
    isConnected,
    connectionStatus,
    lastUpdate,
    error,
    connect,
    disconnect,
    subscribeToTicker,
    unsubscribeFromTicker
  };
};

// Mock data generator for development/testing
export const useMockRealTimeData = (): RealTimeDataHook => {
  const [tickers, setTickers] = useState<TickerState[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Generate mock ticker data
  useEffect(() => {
    const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'];
    
    const generateMockTicker = (symbol: string): TickerState => {
      const states: Array<'READY' | 'SET' | 'GO' | 'HOLD' | 'EXIT'> = ['READY', 'SET', 'GO', 'HOLD', 'EXIT'];
      const state = states[Math.floor(Math.random() * states.length)];
      const confidence = Math.random();
      const price = 100 + Math.random() * 300;
      const change = (Math.random() - 0.5) * 10;
      
      return {
        symbol,
        state,
        confidence,
        lastUpdate: new Date(),
        stateHistory: [
          {
            state,
            timestamp: new Date(),
            confidence,
            reason: 'Mock state transition'
          }
        ],
        metrics: {
          price,
          change,
          changePercent: (change / price) * 100,
          volume: Math.floor(Math.random() * 10000000),
          avgVolume: Math.floor(Math.random() * 5000000),
          vix: 15 + Math.random() * 20
        },
        signals: {
          trend: Math.random(),
          momentum: Math.random(),
          volume: Math.random(),
          ribbon: Math.random(),
          fibonacci: Math.random(),
          gamma: Math.random()
        },
        alerts: Math.random() > 0.7 ? [{
          type: Math.random() > 0.5 ? 'WARNING' : 'INFO',
          message: 'Mock alert message',
          timestamp: new Date()
        }] : []
      };
    };
    
    // Initialize mock data
    const initialTickers = symbols.map(generateMockTicker);
    setTickers(initialTickers);
    
    // Update data periodically
    const interval = setInterval(() => {
      setTickers(prevTickers => {
        return prevTickers.map(ticker => {
          // Randomly update some fields
          if (Math.random() > 0.7) {
            const newPrice = ticker.metrics.price + (Math.random() - 0.5) * 2;
            const newChange = newPrice - ticker.metrics.price;
            
            return {
              ...ticker,
              confidence: Math.max(0, Math.min(1, ticker.confidence + (Math.random() - 0.5) * 0.1)),
              lastUpdate: new Date(),
              metrics: {
                ...ticker.metrics,
                price: newPrice,
                change: newChange,
                changePercent: (newChange / ticker.metrics.price) * 100
              },
              signals: {
                trend: Math.max(0, Math.min(1, ticker.signals.trend + (Math.random() - 0.5) * 0.1)),
                momentum: Math.max(0, Math.min(1, ticker.signals.momentum + (Math.random() - 0.5) * 0.1)),
                volume: Math.max(0, Math.min(1, ticker.signals.volume + (Math.random() - 0.5) * 0.1)),
                ribbon: Math.max(0, Math.min(1, ticker.signals.ribbon + (Math.random() - 0.5) * 0.1)),
                fibonacci: Math.max(0, Math.min(1, ticker.signals.fibonacci + (Math.random() - 0.5) * 0.1)),
                gamma: Math.max(0, Math.min(1, ticker.signals.gamma + (Math.random() - 0.5) * 0.1))
              }
            };
          }
          return ticker;
        });
      });
      setLastUpdate(new Date());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    tickers,
    isConnected: true,
    connectionStatus: 'connected',
    lastUpdate,
    error: null,
    connect: () => {},
    disconnect: () => {},
    subscribeToTicker: () => {},
    unsubscribeFromTicker: () => {}
  };
};