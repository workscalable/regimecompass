'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="text-red-400 text-xl font-semibold mb-2">
            Something went wrong
          </div>
          <p className="text-gray-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Specific error fallback for API errors
export function ApiErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
      <div className="text-yellow-400 text-xl font-semibold mb-2">
        Data Service Error
      </div>
      <p className="text-gray-400 mb-4">
        Unable to fetch market data. Using cached data or fallback values.
      </p>
      <div className="text-sm text-gray-500 mb-4">
        Error: {error?.message || 'Unknown API error'}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white transition-colors"
      >
        Retry Connection
      </button>
    </div>
  );
}

export default ErrorBoundary;