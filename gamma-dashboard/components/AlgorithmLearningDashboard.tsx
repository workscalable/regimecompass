'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  BarChart3,
  Lightbulb,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useAlgorithmLearningData } from '../hooks/useAlgorithmLearningData';

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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CONFIDENCE_CALIBRATION': return <Target className="h-4 w-4" />;
    case 'FIB_ZONE_EFFECTIVENESS': return <BarChart3 className="h-4 w-4" />;
    case 'SIGNAL_OPTIMIZATION': return <TrendingUp className="h-4 w-4" />;
    case 'RISK_ADJUSTMENT': return <AlertCircle className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'HIGH': return 'bg-red-500';
    case 'MEDIUM': return 'bg-yellow-500';
    case 'LOW': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const InsightCard: React.FC<{ insight: LearningInsight; onApply: (id: string) => void }> = ({ insight, onApply }) => {
  return (
    <Card className={`${insight.applied ? 'border-green-200 bg-green-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(insight.category)}
            <span className="text-sm font-medium">{insight.category.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getImpactColor(insight.impact)} text-white`}>
              {insight.impact}
            </Badge>
            {insight.applied && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Confidence: {(insight.confidence * 100).toFixed(0)}%
          </span>
          <span className="text-xs text-gray-400">
            {insight.createdAt.toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm mb-1">Insight</h4>
          <p className="text-sm text-gray-700">{insight.insight}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-1">Recommendation</h4>
          <p className="text-sm text-gray-700">{insight.recommendation}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-1">Implementation</h4>
          <p className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
            {insight.implementation}
          </p>
        </div>
        
        {!insight.applied && (
          <Button 
            size="sm" 
            onClick={() => onApply(insight.id)}
            className="w-full"
          >
            Apply Recommendation
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const ConfidenceCalibrationChart: React.FC<{ calibration: ConfidenceCalibration }> = ({ calibration }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Confidence Calibration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Calibration Score */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Calibration Score</span>
            <span className="font-medium">{(calibration.calibrationScore * 100).toFixed(1)}%</span>
          </div>
          <Progress value={calibration.calibrationScore * 100} className="h-2" />
        </div>

        {/* Threshold Adjustment */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm font-medium">Current Threshold</div>
            <div className="text-lg font-bold">{calibration.currentThreshold.toFixed(3)}</div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-sm font-medium">Optimal Threshold</div>
            <div className="text-lg font-bold">{calibration.optimalThreshold.toFixed(3)}</div>
          </div>
        </div>

        {/* Calibration Buckets */}
        <div>
          <h4 className="font-medium text-sm mb-3">Confidence vs Actual Performance</h4>
          <div className="space-y-2">
            {calibration.confidenceBuckets.map((bucket, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{bucket.range}</div>
                  <div className="text-xs text-gray-500">{bucket.trades} trades</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm">Predicted: {(bucket.predicted * 100).toFixed(0)}%</div>
                  <div className="text-sm">Actual: {(bucket.actual * 100).toFixed(0)}%</div>
                </div>
                <div className="flex-1 text-right">
                  <div className={`text-sm font-medium ${bucket.calibrationError < 0.1 ? 'text-green-600' : bucket.calibrationError < 0.2 ? 'text-yellow-600' : 'text-red-600'}`}>
                    Error: {(bucket.calibrationError * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bias Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-red-50 rounded">
            <div className="text-sm font-medium text-red-700">Overconfidence Rate</div>
            <div className="text-lg font-bold text-red-700">{(calibration.overconfidenceRate * 100).toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded">
            <div className="text-sm font-medium text-yellow-700">Underconfidence Rate</div>
            <div className="text-lg font-bold text-yellow-700">{(calibration.underconfidenceRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LearningProgressChart: React.FC<{ progress: LearningProgress }> = ({ progress }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm font-medium">Performance Improvement</div>
            <div className="text-lg font-bold text-blue-700">
              +{(progress.performanceImprovement * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-sm font-medium">Learning Velocity</div>
            <div className="text-lg font-bold text-green-700">
              {progress.learningVelocity.toFixed(2)} insights/day
            </div>
          </div>
        </div>

        {/* Insights Applied */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Insights Applied</span>
            <span className="font-medium">{progress.appliedInsights} / {progress.totalInsights}</span>
          </div>
          <Progress value={(progress.appliedInsights / progress.totalInsights) * 100} className="h-2" />
        </div>

        {/* Confidence Improvement */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Confidence Improvement</span>
            <span className="font-medium">+{(progress.confidenceImprovement * 100).toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(progress.confidenceImprovement * 100, 100)} className="h-2" />
        </div>

        {/* Recent Adjustments */}
        <div>
          <h4 className="font-medium text-sm mb-3">Recent Parameter Adjustments</h4>
          <div className="space-y-2">
            {progress.recentAdjustments.slice(0, 5).map((adjustment, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{adjustment.parameter}</div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{adjustment.oldValue.toFixed(3)}</span>
                  <span>→</span>
                  <span className="font-medium">{adjustment.newValue.toFixed(3)}</span>
                  <Badge className={`${adjustment.impact > 0 ? 'bg-green-500' : 'bg-red-500'} text-white text-xs`}>
                    {adjustment.impact > 0 ? '+' : ''}{(adjustment.impact * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AlgorithmLearningDashboard: React.FC = () => {
  const { insights, calibration, progress, loading, error, applyInsight, refreshData } = useAlgorithmLearningData();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredInsights = selectedCategory === 'ALL' 
    ? insights 
    : insights.filter(insight => insight.category === selectedCategory);

  const categories = ['ALL', 'CONFIDENCE_CALIBRATION', 'FIB_ZONE_EFFECTIVENESS', 'SIGNAL_OPTIMIZATION', 'RISK_ADJUSTMENT'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading learning data: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Algorithm Learning Insights
        </h2>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
          <TabsTrigger value="calibration">Confidence Calibration</TabsTrigger>
          <TabsTrigger value="progress">Learning Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category.replace('_', ' ')}
              </Button>
            ))}
          </div>

          {/* Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredInsights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onApply={applyInsight}
              />
            ))}
          </div>

          {filteredInsights.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No insights available for the selected category.
            </div>
          )}
        </TabsContent>

        <TabsContent value="calibration">
          <ConfidenceCalibrationChart calibration={calibration || { 
            totalTrades: 0, 
            calibrationScore: 0, 
            overconfidenceRate: 0, 
            underconfidenceRate: 0, 
            optimalThreshold: 0, 
            currentThreshold: 0, 
            adjustmentRecommendation: 0, 
            confidenceBuckets: [] 
          }} />
        </TabsContent>

        <TabsContent value="progress">
          <LearningProgressChart progress={progress || { 
            totalInsights: 0, 
            appliedInsights: 0, 
            performanceImprovement: 0, 
            learningVelocity: 0, 
            confidenceImprovement: 0, 
            riskAdjustmentEffectiveness: 0, 
            recentAdjustments: [] 
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlgorithmLearningDashboard;