'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Lightbulb,
  Settings,
  RefreshCw
} from 'lucide-react';

interface ConfidenceAdjustment {
  signalType: string;
  originalConfidence: number;
  adjustedConfidence: number;
  adjustment: number;
  effectivenessScore: number;
  sampleSize: number;
  lastUpdated: string;
}

interface LearningInsight {
  category: 'CONFIDENCE_CALIBRATION' | 'MARKET_REGIME' | 'OPTIONS_SELECTION' | 'TIMING';
  insight: string;
  confidence: number;
  supportingData: any;
  actionable: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Recommendation {
  type: 'POSITION_SIZING' | 'ENTRY_TIMING' | 'EXIT_STRATEGY' | 'RISK_MANAGEMENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  implementation: string;
  implemented: boolean;
}

interface CalibrationMetrics {
  overallCalibration: number;
  brier: number;
  logLoss: number;
  reliability: number;
  resolution: number;
  uncertainty: number;
}

interface LearningMetrics {
  totalAdjustments: number;
  avgEffectivenessImprovement: number;
  confidenceCalibrationScore: number;
  learningVelocity: number;
  adaptationRate: number;
}

export const LearningInsights: React.FC = () => {
  const [adjustments, setAdjustments] = useState<ConfidenceAdjustment[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [calibrationMetrics, setCalibrationMetrics] = useState<CalibrationMetrics>({
    overallCalibration: 0,
    brier: 0,
    logLoss: 0,
    reliability: 0,
    resolution: 0,
    uncertainty: 0
  });
  const [learningMetrics, setLearningMetrics] = useState<LearningMetrics>({
    totalAdjustments: 0,
    avgEffectivenessImprovement: 0,
    confidenceCalibrationScore: 0,
    learningVelocity: 0,
    adaptationRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningData();
    const interval = setInterval(fetchLearningData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLearningData = async () => {
    try {
      const [adjustmentsRes, insightsRes, recommendationsRes, calibrationRes, metricsRes] = await Promise.all([
        fetch('/api/learning/adjustments'),
        fetch('/api/learning/insights'),
        fetch('/api/learning/recommendations'),
        fetch('/api/learning/calibration'),
        fetch('/api/learning/metrics')
      ]);

      if (adjustmentsRes.ok) {
        const data = await adjustmentsRes.json();
        setAdjustments(data);
      }

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data);
      }

      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json();
        setRecommendations(data);
      }

      if (calibrationRes.ok) {
        const data = await calibrationRes.json();
        setCalibrationMetrics(data);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setLearningMetrics(data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
      setLoading(false);
    }
  };

  const implementRecommendation = async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/learning/recommendations/${recommendationId}/implement`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchLearningData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
    }
  };

  const resetLearning = async () => {
    try {
      const response = await fetch('/api/learning/reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchLearningData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to reset learning:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CONFIDENCE_CALIBRATION': return <Target className="w-4 h-4" />;
      case 'MARKET_REGIME': return <TrendingUp className="w-4 h-4" />;
      case 'OPTIONS_SELECTION': return <BarChart3 className="w-4 h-4" />;
      case 'TIMING': return <Clock className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCalibrationColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading learning insights...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">🧠 Learning Insights</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchLearningData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={resetLearning}>
            <Settings className="w-4 h-4 mr-2" />
            Reset Learning
          </Button>
        </div>
      </div>

      {/* Learning Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Calibration Score</p>
                <p className={`text-2xl font-bold ${getCalibrationColor(calibrationMetrics.overallCalibration)}`}>
                  {(calibrationMetrics.overallCalibration * 100).toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Adjustments</p>
                <p className="text-2xl font-bold">{learningMetrics.totalAdjustments}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Velocity</p>
                <p className="text-2xl font-bold">{learningMetrics.learningVelocity.toFixed(2)}</p>
                <p className="text-sm text-gray-500">adj/day</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Adaptation Rate</p>
                <p className="text-2xl font-bold">{(learningMetrics.adaptationRate * 100).toFixed(1)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Insights ({insights.length})</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations ({recommendations.length})</TabsTrigger>
          <TabsTrigger value="adjustments">Confidence Adjustments ({adjustments.length})</TabsTrigger>
          <TabsTrigger value="calibration">Calibration Analysis</TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No learning insights available yet. More data needed for analysis.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getCategoryIcon(insight.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{insight.category.replace('_', ' ')}</Badge>
                            <Badge variant={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                            {insight.actionable && (
                              <Badge variant="default">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actionable
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-900 mb-2">{insight.insight}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Confidence:</span>
                            <Progress value={insight.confidence * 100} className="w-20 h-2" />
                            <span className="text-sm font-medium">
                              {(insight.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No recommendations available. System is performing optimally.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge variant="outline">{rec.type.replace('_', ' ')}</Badge>
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                          {rec.implemented && (
                            <Badge variant="default">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Implemented
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{rec.description}</h4>
                        <p className="text-gray-600 mb-2">
                          <strong>Impact:</strong> {rec.impact}
                        </p>
                        <p className="text-gray-600 mb-3">
                          <strong>Implementation:</strong> {rec.implementation}
                        </p>
                      </div>
                      {!rec.implemented && (
                        <Button
                          size="sm"
                          onClick={() => implementRecommendation(index.toString())}
                        >
                          Implement
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Confidence Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Confidence Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              {adjustments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No confidence adjustments active yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Signal Type</th>
                        <th className="text-left p-2">Original</th>
                        <th className="text-left p-2">Adjusted</th>
                        <th className="text-left p-2">Adjustment</th>
                        <th className="text-left p-2">Effectiveness</th>
                        <th className="text-left p-2">Sample Size</th>
                        <th className="text-left p-2">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((adj, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{adj.signalType}</td>
                          <td className="p-2">{(adj.originalConfidence * 100).toFixed(1)}%</td>
                          <td className="p-2">{(adj.adjustedConfidence * 100).toFixed(1)}%</td>
                          <td className={`p-2 font-medium ${adj.adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.adjustment >= 0 ? '+' : ''}{(adj.adjustment * 100).toFixed(1)}%
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <Progress value={adj.effectivenessScore * 100} className="w-16 h-2" />
                              <span className="text-sm">
                                {(adj.effectivenessScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-2">{adj.sampleSize}</td>
                          <td className="p-2 text-sm text-gray-500">
                            {new Date(adj.lastUpdated).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calibration Analysis Tab */}
        <TabsContent value="calibration" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Calibration Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Overall Calibration:</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={calibrationMetrics.overallCalibration * 100} className="w-20 h-2" />
                    <span className={`font-medium ${getCalibrationColor(calibrationMetrics.overallCalibration)}`}>
                      {(calibrationMetrics.overallCalibration * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span>Brier Score:</span>
                  <span className="font-medium">{calibrationMetrics.brier.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Log Loss:</span>
                  <span className="font-medium">{calibrationMetrics.logLoss.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Reliability:</span>
                  <span className="font-medium">{calibrationMetrics.reliability.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="font-medium">{calibrationMetrics.resolution.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Uncertainty:</span>
                  <span className="font-medium">{calibrationMetrics.uncertainty.toFixed(4)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Effectiveness Improvement:</span>
                  <span className="font-medium text-green-600">
                    +{(learningMetrics.avgEffectivenessImprovement * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Confidence Calibration:</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={learningMetrics.confidenceCalibrationScore * 100} className="w-20 h-2" />
                    <span className="font-medium">
                      {(learningMetrics.confidenceCalibrationScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span>Learning Velocity:</span>
                  <span className="font-medium">{learningMetrics.learningVelocity.toFixed(2)} adj/day</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Adaptation Rate:</span>
                  <span className="font-medium">{(learningMetrics.adaptationRate * 100).toFixed(1)}%</span>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>Status:</strong> {
                        calibrationMetrics.overallCalibration > 0.8 
                          ? 'Well Calibrated' 
                          : calibrationMetrics.overallCalibration > 0.6 
                          ? 'Moderately Calibrated' 
                          : 'Needs Improvement'
                      }
                    </p>
                    <p>
                      The system is {learningMetrics.totalAdjustments > 0 ? 'actively learning' : 'collecting data'} 
                      {learningMetrics.totalAdjustments > 0 && ` with ${learningMetrics.totalAdjustments} active adjustments`}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};