import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center bg-black border border-zinc-800 rounded-2xl text-white">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-white">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-display text-lg uppercase tracking-wider font-bold mb-2 text-white">
            {this.props.fallbackTitle || 'Display Interruption Recovered'}
          </h2>
          <p className="font-mono text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
            The requested console view encountered a momentary display anomaly. Your data is secure.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-display text-xs uppercase tracking-wider font-bold transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4 text-black" />
              <span>Retry View</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-display text-xs uppercase tracking-wider font-semibold border border-zinc-800 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
