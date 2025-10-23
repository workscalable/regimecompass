import { useState, useEffect } from 'react';

interface LearningInsight {
  id: string;
  category: 'CONFIDENCE_CALIBRATION' | 'FIB_ZONE_EFFECTIVENESS' | 'SIGNAL_OPTIMIZATION' | 'RISK_ADJUSTMENT';
  insight: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  implementation: string;
  supportingData: any;
  applied: boolean;
  createdAt: Date;
}

interface ConfidenceCalibration {
  totalTrades: number;
  calibrationScore: number;
  overconfidenceRate: number;
  underconfidenceRate: number;
  optimalThreshold: number;
  currentThreshold: number;
  adjustmentRecommendation: number;
  confidenceBuckets: {
    range: string;
    predicted: number;
    actual: number;
    trades: number;
    calibrationError: number;
  }[];
}

interface LearningProgress {
  totalInsights: number;
  appliedInsights: number;
  performanceImprovement: number;
  learningVelocity: number;
  confidenceImprovement: number;
  riskAdjustmentEffectiveness: number;
  recentAdjustments: {
    parameter: string;
    oldValue: number;
    newValue: number;
    impact: number;
    date: Date;
  }[];
}

export const useAlgorithmLearningData = () => {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [calibration, setCalibration] = useState<ConfidenceCalibration | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateMockInsights = (): LearningInsight[] => {
    const categories = ['CONFIDENCE_CALIBRATION', 'FIB_ZONE_EFFECTIVENESS', 'SIGNAL_OPTIMIZATION', 'RISK_ADJUSTMENT'] as const;
    const impacts = ['HIGH', 'MEDIUM', 'LOW'] as const;
    
    const insightTemplates = [
      {
        category: 'CONFIDENCE_CALIBRATION' as const,
        insight: 'Algorithm shows 15% overconfidence in the 0.7-0.8 confidence range. Actual win rate is 65% vs predicted 80%.',
        recommendation: 'Reduce confidence threshold from 0.75 to 0.68 for this range to improve calibration.',
        implementation: 'confidenceThresholds.medium = 0.68'
      },
      {
        category: 'FIB_ZONE_EFFECTIVENESS' as const,
        insight: 'EXHAUSTION zone trades have 85% loss rate over the last 30 days, significantly higher than expected.',
        recommendation: 'Increase EXHAUSTION zone multiplier from 0.0 to complete trade blocking.',
        implementation: 'fibZoneMultipliers.EXHAUSTION = 0.0'
      },
      {
        category: 'SIGNAL_OPTIMIZATION' as const,
        insight: 'Volume profile factor shows 23% higher effectiveness during first 2 hours of market open.',
        recommendation: 'Increase volume profile weight from 20% to 25% during 9:30-11:30 AM EST.',
        implementation: 'timeBasedWeights.volumeProfile.morning = 0.25'
      },
      {
        category: 'RISK_ADJUSTMENT' as const,
        insight: 'Position sizing is too aggressive during high VIX periods (>25), leading to 12% higher drawdowns.',
        recommendation: 'Implement additional VIX-based position size reduction of 30% when VIX > 25.',
        implementation: 'vixAdjustments.high = 0.7'
      },
      {
        category: 'CONFIDENCE_CALIBRATION' as const,
        insight: 'Low confidence trades (0.6-0.65) are outperforming expectations with 72% win rate vs predicted 62%.',
        recommendation: 'Lower the minimum confidence threshold from 0.62 to 0.58 to capture more opportunities.',
        implementation: 'minConfidenceThreshold = 0.58'
      },
      {
        category: 'SIGNAL_OPTIMIZATION' as const,
        insight: 'Gamma exposure factor effectiveness drops 40% during earnings season due to elevated IV.',
        recommendation: 'Reduce gamma exposure weight from 10% to 6% during earnings weeks.',
        implementation: 'earningsAdjustments.gammaWeight = 0.06'
      }
    ];

    return insightTemplates.map((template, index) => ({
      id: `insight-${index}`,
      category: template.category,
      insight: template.insight,
      confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      impact: impacts[Math.floor(Math.random() * impacts.length)],
      recommendation: template.recommendation,
      implementation: template.implementation,
      supportingData: {
        trades: Math.floor(Math.random() * 100) + 50,
        winRate: Math.random() * 0.4 + 0.5,
        profitFactor: Math.random() * 2 + 0.5
      },
      applied: Math.random() > 0.6,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }));
  };

  const generateMockCalibration = (): ConfidenceCalibration => {
    const buckets = [
      { range: '0.60-0.65', predicted: 0.62, actual: 0.68, trades: 45 },
      { range: '0.65-0.70', predicted: 0.67, actual: 0.64, trades: 38 },
      { range: '0.70-0.75', predicted: 0.72, actual: 0.69, trades: 52 },
      { range: '0.75-0.80', predicted: 0.77, actual: 0.71, trades: 41 },
      { range: '0.80-0.85', predicted: 0.82, actual: 0.79, trades: 29 },
      { range: '0.85-0.90', predicted: 0.87, actual: 0.85, trades: 18 },
      { range: '0.90+', predicted: 0.92, actual: 0.89, trades: 12 }
    ];

    const bucketsWithError = buckets.map(bucket => ({
      ...bucket,
      calibrationError: Math.abs(bucket.predicted - bucket.actual)
    }));

    const totalTrades = buckets.reduce((sum, bucket) => sum + bucket.trades, 0);
    const overconfidenceRate = bucketsWithError.filter(b => b.predicted > b.actual).length / bucketsWithError.length;
    const underconfidenceRate = bucketsWithError.filter(b => b.predicted < b.actual).length / bucketsWithError.length;
    const avgCalibrationError = bucketsWithError.reduce((sum, b) => sum + b.calibrationError, 0) / bucketsWithError.length;

    return {
      totalTrades,
      calibrationScore: 1 - avgCalibrationError,
      overconfidenceRate,
      underconfidenceRate,
      optimalThreshold: 0.68,
      currentThreshold: 0.72,
      adjustmentRecommendation: -0.04,
      confidenceBuckets: bucketsWithError
    };
  };

  const generateMockProgress = (): LearningProgress => {
    const adjustments = [
      { parameter: 'confidenceThreshold', oldValue: 0.72, newValue: 0.68, impact: 0.08, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { parameter: 'volumeWeight', oldValue: 0.20, newValue: 0.22, impact: 0.05, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { parameter: 'fibZoneMultiplier.EXHAUSTION', oldValue: 0.2, newValue: 0.0, impact: 0.12, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { parameter: 'vixAdjustment', oldValue: 0.8, newValue: 0.7, impact: 0.06, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { parameter: 'momentumWeight', oldValue: 0.18, newValue: 0.20, impact: 0.03, date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) }
    ];

    return {
      totalInsights: 15,
      appliedInsights: 9,
      performanceImprovement: 0.18,
      learningVelocity: 2.3,
      confidenceImprovement: 0.12,
      riskAdjustmentEffectiveness: 0.85,
      recentAdjustments: adjustments
    };
  };

  const fetchLearningData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, these would be separate API calls
      // const [insightsResponse, calibrationResponse, progressResponse] = await Promise.all([
      //   fetch('/api/learning/insights'),
      //   fetch('/api/learning/calibration'),
      //   fetch('/api/learning/progress')
      // ]);
      
      // For now, use mock data
      const mockInsights = generateMockInsights();
      const mockCalibration = generateMockCalibration();
      const mockProgress = generateMockProgress();
      
      setInsights(mockInsights);
      setCalibration(mockCalibration);
      setProgress(mockProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch learning data');
    } finally {
      setLoading(false);
    }
  };

  const applyInsight = async (insightId: string) => {
    try {
      // In a real implementation, this would make an API call
      // await fetch(`/api/learning/insights/${insightId}/apply`, { method: 'POST' });
      
      // For now, just update the local state
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, applied: true }
          : insight
      ));
      
      // Update progress
      if (progress) {
        setProgress(prev => prev ? {
          ...prev,
          appliedInsights: prev.appliedInsights + 1
        } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply insight');
    }
  };

  useEffect(() => {
    fetchLearningData();
    
    // Set up periodic updates every 5 minutes
    const interval = setInterval(fetchLearningData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    insights,
    calibration,
    progress,
    loading,
    error,
    applyInsight,
    refreshData: fetchLearningData
  };
};