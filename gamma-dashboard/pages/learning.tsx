import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import FibonacciDashboard from '../components/FibonacciDashboard';
import AlgorithmLearningDashboard from '../components/AlgorithmLearningDashboard';
import { BarChart3, Brain } from 'lucide-react';

const LearningPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Learning & Analysis</h1>
        <div className="text-sm text-gray-500">
          Real-time algorithm insights and Fibonacci analysis
        </div>
      </div>

      <Tabs defaultValue="fibonacci" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fibonacci" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Fibonacci Analysis
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Algorithm Learning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fibonacci" className="mt-6">
          <FibonacciDashboard />
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          <AlgorithmLearningDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningPage;