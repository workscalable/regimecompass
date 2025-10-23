export default function HealthPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">System Health</h2>
        <p className="text-gray-400">
          Monitor data sources and system performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* API Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">API Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Polygon.io</span>
              <span className="px-2 py-1 rounded text-sm bg-yellow-900/30 text-yellow-300">
                Checking...
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Twelve Data</span>
              <span className="px-2 py-1 rounded text-sm bg-yellow-900/30 text-yellow-300">
                Checking...
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tradier</span>
              <span className="px-2 py-1 rounded text-sm bg-yellow-900/30 text-yellow-300">
                Checking...
              </span>
            </div>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Data Freshness</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Last Update:</span>
              <span className="text-gray-400">--:--</span>
            </div>
            <div className="flex justify-between">
              <span>Market Data:</span>
              <span className="text-gray-400">--</span>
            </div>
            <div className="flex justify-between">
              <span>VIX Data:</span>
              <span className="text-gray-400">--</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Response Time:</span>
              <span className="text-gray-400">-- ms</span>
            </div>
            <div className="flex justify-between">
              <span>Cache Hit Rate:</span>
              <span className="text-gray-400">--%</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="text-gray-400">--</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}