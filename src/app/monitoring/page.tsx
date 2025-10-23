'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemHealthDashboard } from '@/components/monitoring/SystemHealthDashboard';
import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';
import { ErrorHandlingDashboard } from '@/components/monitoring/ErrorHandlingDashboard';
import { LoggingAlertingDashboard } from '@/components/monitoring/LoggingAlertingDashboard';
import { Activity, Heart, Zap, Shield, FileText } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="h-8 w-8 mr-3 text-blue-600" />
            System Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor system health, performance metrics, and operational status
          </p>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>System Health</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Error Handling</span>
            </TabsTrigger>
            <TabsTrigger value="logging" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Logging & Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <ErrorHandlingDashboard />
          </TabsContent>

          <TabsContent value="logging" className="space-y-6">
            <LoggingAlertingDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}