import { Suspense } from 'react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Market Regime Dashboard</h2>
        <p className="text-gray-400">
          Real-time market regime detection and trading signals
        </p>
      </div>
      
      <Suspense fallback={<div className="text-center">Loading market data...</div>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regime Status Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Current Regime</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                LOADING...
              </div>
              <p className="text-gray-400">Analyzing market conditions</p>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Market Overview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Breadth:</span>
                <span className="text-gray-400">Loading...</span>
              </div>
              <div className="flex justify-between">
                <span>VIX:</span>
                <span className="text-gray-400">Loading...</span>
              </div>
              <div className="flex justify-between">
                <span>Trend Score:</span>
                <span className="text-gray-400">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </Suspense>

      <div className="text-center text-sm text-gray-500">
        <p>System initializing... Full dashboard coming online.</p>
      </div>
    </div>
  );
}