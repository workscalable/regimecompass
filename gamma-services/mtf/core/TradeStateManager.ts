// File: /gamma-services/mtf/core/TradeStateManager.ts

import fs from 'fs/promises';
import path from 'path';
import { TradeDecision, TradeState } from './TradeDecisionEngine';

export interface TradeStateLog {
  entries: TradeDecision[];
  metadata: {
    version: string;
    createdAt: string;
    lastUpdated: string;
  };
}

export class TradeStateManager {
  private static readonly LOG_FILE = path.join(process.cwd(), 'gamma-services', 'mtf', 'data', 'trade_state_log.json');
  private static readonly ACTIVE_SIGNALS_FILE = path.join(process.cwd(), 'gamma-services', 'mtf', 'data', 'active_signals.json');

  public static async persist(decision: TradeDecision): Promise<void> {
    try {
      // Ensure data directory exists
      await this.ensureDataDirectory();

      // Persist to trade state log
      await this.appendToLog(decision);

      // Update active signals
      await this.updateActiveSignals(decision);
    } catch (error) {
      console.error('Failed to persist trade state:', error);
      throw error;
    }
  }

  public static async getRecentDecisions(ticker: string, limit: number = 50): Promise<TradeDecision[]> {
    try {
      const log = await this.loadLog();
      return log.entries
        .filter(entry => entry.ticker === ticker)
        .slice(-limit);
    } catch (error) {
      console.error('Failed to load recent decisions:', error);
      return [];
    }
  }

  public static async getActiveSignals(): Promise<Record<string, TradeDecision>> {
    try {
      const data = await fs.readFile(this.ACTIVE_SIGNALS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  public static async getAllDecisions(): Promise<TradeDecision[]> {
    try {
      const log = await this.loadLog();
      return log.entries;
    } catch (error) {
      console.error('Failed to load all decisions:', error);
      return [];
    }
  }

  public static async getDecisionsByTimeRange(
    startTime: Date, 
    endTime: Date
  ): Promise<TradeDecision[]> {
    try {
      const log = await this.loadLog();
      return log.entries.filter(entry => {
        const entryTime = new Date(entry.timestamp);
        return entryTime >= startTime && entryTime <= endTime;
      });
    } catch (error) {
      console.error('Failed to load decisions by time range:', error);
      return [];
    }
  }

  public static async clearOldEntries(daysToKeep: number = 30): Promise<void> {
    try {
      const log = await this.loadLog();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredEntries = log.entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
      });

      log.entries = filteredEntries;
      log.metadata.lastUpdated = new Date().toISOString();

      await fs.writeFile(this.LOG_FILE, JSON.stringify(log, null, 2));
      console.log(`Cleared ${log.entries.length - filteredEntries.length} old entries`);
    } catch (error) {
      console.error('Failed to clear old entries:', error);
    }
  }

  private static async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.LOG_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async loadLog(): Promise<TradeStateLog> {
    try {
      const data = await fs.readFile(this.LOG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        entries: [],
        metadata: {
          version: '3.0',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }

  private static async appendToLog(decision: TradeDecision): Promise<void> {
    let log: TradeStateLog;
    
    try {
      log = await this.loadLog();
    } catch {
      log = {
        entries: [],
        metadata: {
          version: '3.0',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };
    }

    log.entries.push(decision);
    log.metadata.lastUpdated = new Date().toISOString();

    await fs.writeFile(this.LOG_FILE, JSON.stringify(log, null, 2));
  }

  private static async updateActiveSignals(decision: TradeDecision): Promise<void> {
    let activeSignals: Record<string, TradeDecision>;
    
    try {
      const data = await fs.readFile(this.ACTIVE_SIGNALS_FILE, 'utf-8');
      activeSignals = JSON.parse(data);
    } catch {
      activeSignals = {};
    }

    // Remove if in terminal state, otherwise add/update
    if (['EXIT', 'ABORT', 'READY'].includes(decision.state)) {
      delete activeSignals[decision.ticker];
    } else {
      activeSignals[decision.ticker] = decision;
    }

    await fs.writeFile(this.ACTIVE_SIGNALS_FILE, JSON.stringify(activeSignals, null, 2));
  }

  // Utility methods for analysis
  public static async getPerformanceStats(): Promise<{
    totalDecisions: number;
    stateDistribution: Record<TradeState, number>;
    averageConfidence: number;
    tickerActivity: Record<string, number>;
  }> {
    try {
      const decisions = await this.getAllDecisions();
      
      const stateDistribution: Record<TradeState, number> = {
        'READY': 0,
        'SET': 0,
        'GO': 0,
        'TRADE': 0,
        'EXIT': 0,
        'ABORT': 0
      };

      const tickerActivity: Record<string, number> = {};
      let totalConfidence = 0;

      decisions.forEach(decision => {
        stateDistribution[decision.state]++;
        tickerActivity[decision.ticker] = (tickerActivity[decision.ticker] || 0) + 1;
        totalConfidence += decision.confidence;
      });

      return {
        totalDecisions: decisions.length,
        stateDistribution,
        averageConfidence: decisions.length > 0 ? totalConfidence / decisions.length : 0,
        tickerActivity
      };
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      return {
        totalDecisions: 0,
        stateDistribution: {
          'READY': 0,
          'SET': 0,
          'GO': 0,
          'TRADE': 0,
          'EXIT': 0,
          'ABORT': 0
        },
        averageConfidence: 0,
        tickerActivity: {}
      };
    }
  }
}