import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        friendly = parsed.error.includes('Missing or insufficient permissions')
          ? 'Access denied while syncing data. Please sign in again with a verified Google account.'
          : parsed.error;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: friendly };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-emerald-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-emerald-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/40 flex items-center justify-center mx-auto text-red-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Choy Chat Sync Notice</h2>
            <p className="text-xs text-emerald-200 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" /> Reload Choy Chat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
