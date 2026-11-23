import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(readable);
      if (parsed && typeof parsed.error === 'string') {
        readable = `${parsed.operationType?.toUpperCase() || 'Operation'} error on ${parsed.path || 'database'}: ${parsed.error}`;
      }
    } catch {
      // plain string error
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F5F1] dark:bg-[#111214] p-6">
          <div className="max-w-md w-full rounded-xl bg-white dark:bg-[#181A1F] border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Workspace Interrupted
              </h2>
            </div>
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-300 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Memoir
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
