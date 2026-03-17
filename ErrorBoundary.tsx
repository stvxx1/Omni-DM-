import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 flex flex-col items-center justify-center font-sans">
          <div className="max-w-xl w-full glass-panel p-8 md:p-10 rounded-2xl text-center border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.1)]">
            <h1 className="text-2xl md:text-3xl font-bold text-red-500 mb-4 uppercase tracking-widest font-serif">System Failure</h1>
            <p className="text-zinc-400 mb-8 font-mono text-xs md:text-sm">The neural link has been severed. A critical error occurred in the simulation.</p>
            
            <div className="bg-black/50 p-4 rounded-lg text-left font-mono text-xs text-red-400 mb-8 overflow-auto max-h-40 border border-red-900/30">
              {this.state.error?.message || "Unknown fatal error"}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors uppercase tracking-wider text-xs md:text-sm font-bold"
              >
                Reload Interface
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('omni_dm_save');
                  window.location.reload();
                }}
                className="px-6 py-3 bg-red-900/40 hover:bg-red-800/60 text-red-100 rounded-lg transition-colors uppercase tracking-wider text-xs md:text-sm font-bold border border-red-900/50"
              >
                Clear Save & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
