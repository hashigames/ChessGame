import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetApp = () => {
    try {
      indexedDB.deleteDatabase('Chess3DModelDatabase');
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0c0c0e] text-[#e0e0e0] flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="max-w-md w-full bg-[#18181b] border border-[#2a2a2e] rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle size={24} />
            </div>
            
            <h1 className="text-lg font-bold text-white mb-2">Tactical 3D Chess Studio</h1>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              An unexpected render issue occurred. You can safely restore the application viewport or reset corrupted cached states below.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full mb-4">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold rounded-lg text-xs transition-all active:scale-95 shadow-md"
              >
                <RefreshCw size={14} />
                <span>Reload App</span>
              </button>

              <button
                onClick={this.handleResetApp}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-lg text-xs transition-all active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Reset & Clear Cache</span>
              </button>
            </div>

            {this.state.error && (
              <details className="w-full text-left bg-black/50 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-500 mt-2 overflow-x-auto max-h-32">
                <summary className="cursor-pointer text-zinc-400 font-semibold select-none">
                  Diagnostic Details
                </summary>
                <div className="mt-2 text-red-400 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
