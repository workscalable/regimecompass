export default function SignalsPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Trading Signals</h2>
        <p className="text-gray-400">
          Real-time trading recommendations based on regime analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Long Candidates */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-green-400">
            Long Candidates
          </h3>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              Loading signals...
            </div>
          </div>
        </div>

        {/* Hedge Suggestions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-yellow-400">
            Hedge Suggestions
          </h3>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              Loading signals...
            </div>
          </div>
        </div>

        {/* Avoid List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-red-400">
            Avoid List
          </h3>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              Loading signals...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}