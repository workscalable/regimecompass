import { Request, Response } from 'express';
import { ParameterCustomizationAPI } from './ParameterCustomizationAPI';
import { ConfigurationService } from './ConfigurationService';

/**
 * REST API wrapper for Parameter Customization
 * 
 * Provides HTTP endpoints for parameter customization:
 * - GET /api/config/watchlist - Get current watchlist
 * - POST /api/config/watchlist/add - Add tickers to watchlist
 * - POST /api/config/watchlist/remove - Remove tickers from watchlist
 * - PUT /api/config/watchlist/reorder - Reorder watchlist
 * - GET /api/config/signal-weights - Get signal weights
 * - PUT /api/config/signal-weights - Update signal weights
 * - GET /api/config/confidence-thresholds - Get confidence thresholds
 * - PUT /api/config/confidence-thresholds - Update confidence thresholds
 * - GET /api/config/risk-parameters - Get risk parameters
 * - PUT /api/config/risk-parameters - Update risk parameters
 * - GET /api/config/fib-zone-multipliers - Get Fibonacci zone multipliers
 * - PUT /api/config/fib-zone-multipliers - Update Fibonacci zone multipliers
 * - GET /api/config/presets - Get available presets
 * - POST /api/config/presets/:name/apply - Apply preset
 * - GET /api/config/summary - Get parameter summary
 */

export class ParameterCustomizationRESTAPI {
  private parameterAPI: ParameterCustomizationAPI;

  constructor(configService: ConfigurationService) {
    this.parameterAPI = new ParameterCustomizationAPI(configService);
  }

  // Watchlist endpoints

  public getWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const watchlistInfo = this.parameterAPI.getWatchlistInfo();
      res.json({
        success: true,
        data: watchlistInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get watchlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public addTickersToWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, position, reason } = req.body;
      
      if (!Array.isArray(tickers) || tickers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Tickers array is required and must not be empty'
        });
        return;
      }

      const result = await this.parameterAPI.addTickersToWatchlist(tickers, position, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to add tickers',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public removeTickersFromWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, reason } = req.body;
      
      if (!Array.isArray(tickers) || tickers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Tickers array is required and must not be empty'
        });
        return;
      }

      const result = await this.parameterAPI.removeTickersFromWatchlist(tickers, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to remove tickers',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public reorderWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { newOrder, reason } = req.body;
      
      if (!Array.isArray(newOrder)) {
        res.status(400).json({
          success: false,
          error: 'newOrder array is required'
        });
        return;
      }

      const result = await this.parameterAPI.reorderWatchlist(newOrder, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to reorder watchlist',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Signal weights endpoints

  public getSignalWeights = async (req: Request, res: Response): Promise<void> => {
    try {
      const signalWeightsInfo = this.parameterAPI.getSignalWeightsInfo();
      res.json({
        success: true,
        data: signalWeightsInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get signal weights',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public updateSignalWeights = async (req: Request, res: Response): Promise<void> => {
    try {
      const { adjustments, reason } = req.body;
      
      if (!Array.isArray(adjustments)) {
        res.status(400).json({
          success: false,
          error: 'Adjustments array is required'
        });
        return;
      }

      const result = await this.parameterAPI.adjustSignalWeights(adjustments, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to update signal weights',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Confidence thresholds endpoints

  public getConfidenceThresholds = async (req: Request, res: Response): Promise<void> => {
    try {
      const thresholdsInfo = this.parameterAPI.getConfidenceThresholdsInfo();
      res.json({
        success: true,
        data: thresholdsInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get confidence thresholds',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public updateConfidenceThresholds = async (req: Request, res: Response): Promise<void> => {
    try {
      const { adjustments, reason } = req.body;
      
      if (!Array.isArray(adjustments)) {
        res.status(400).json({
          success: false,
          error: 'Adjustments array is required'
        });
        return;
      }

      const result = await this.parameterAPI.adjustConfidenceThresholds(adjustments, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to update confidence thresholds',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Risk parameters endpoints

  public getRiskParameters = async (req: Request, res: Response): Promise<void> => {
    try {
      const riskParametersInfo = this.parameterAPI.getRiskParametersInfo();
      res.json({
        success: true,
        data: riskParametersInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get risk parameters',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public updateRiskParameters = async (req: Request, res: Response): Promise<void> => {
    try {
      const { adjustments, reason } = req.body;
      
      if (!Array.isArray(adjustments)) {
        res.status(400).json({
          success: false,
          error: 'Adjustments array is required'
        });
        return;
      }

      const result = await this.parameterAPI.adjustRiskParameters(adjustments, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to update risk parameters',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Fibonacci zone multipliers endpoints

  public getFibZoneMultipliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const riskParametersInfo = this.parameterAPI.getRiskParametersInfo();
      res.json({
        success: true,
        data: {
          fibZoneMultipliers: riskParametersInfo.fibZoneMultipliers,
          lastModified: riskParametersInfo.lastModified
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get Fibonacci zone multipliers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public updateFibZoneMultipliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { adjustments, reason } = req.body;
      
      if (!Array.isArray(adjustments)) {
        res.status(400).json({
          success: false,
          error: 'Adjustments array is required'
        });
        return;
      }

      const result = await this.parameterAPI.adjustFibZoneMultipliers(adjustments, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to update Fibonacci zone multipliers',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Presets endpoints

  public getPresets = async (req: Request, res: Response): Promise<void> => {
    try {
      const presets = this.parameterAPI.getAvailablePresets();
      res.json({
        success: true,
        data: presets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get presets',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public applyPreset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const { reason } = req.body;
      
      const result = await this.parameterAPI.applyParameterPreset(name, reason);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.success ? result.appliedChanges : null,
        error: result.success ? null : 'Failed to apply preset',
        validation: result.validation,
        warnings: result.warnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Summary endpoint

  public getParameterSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = this.parameterAPI.getParameterSummary();
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get parameter summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get the parameter customization API instance
   */
  public getParameterAPI(): ParameterCustomizationAPI {
    return this.parameterAPI;
  }
}