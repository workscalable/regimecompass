import TradingOrchestrationDashboard from '@/components/trading/TradingOrchestrationDashboard';

export default function TradingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Trading Orchestration System</h1>
          <p className="text-gray-400">
            Advanced 7-module trading system with pattern recognition, multi-timeframe confirmation, 
            order flow analysis, options intelligence, and signal evolution tracking.
          </p>
        </div>
        
        <TradingOrchestrationDashboard />
      </div>
    </div>
  );
}

