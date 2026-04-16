import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

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
      let errorMessage = "An unexpected error occurred.";
      let isQuotaError = false;

      try {
        const message = this.state.error?.message || '';
        if (message.startsWith('{')) {
          const parsed = JSON.parse(message);
          if (parsed.error?.includes('resource-exhausted') || parsed.error?.includes('Quota exceeded')) {
            errorMessage = "Firestore daily quota exceeded. The free tier limit has been reached. This will reset at midnight (Pacific Time).";
            isQuotaError = true;
          } else {
            errorMessage = parsed.error || message || errorMessage;
          }
        } else {
          if (message.includes('resource-exhausted') || message.includes('Quota exceeded')) {
            errorMessage = "Firestore daily quota exceeded. The free tier limit has been reached. This will reset at midnight (Pacific Time).";
            isQuotaError = true;
          } else {
            errorMessage = message || errorMessage;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="h-screen w-full flex items-center justify-center bg-paper p-8">
          <div className="max-w-2xl w-full bg-card-bg border-4 border-ink p-12 shadow-[16px_16px_0px_0px_var(--color-shadow)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-6 mb-8 text-red-500">
              <AlertCircle size={48} strokeWidth={2.5} />
              <h2 className="text-4xl font-bold tracking-tight">System Interruption</h2>
            </div>
            
            <div className="p-8 bg-paper border-2 border-ink mb-10">
              <p className="text-ink font-bold leading-relaxed tracking-widest text-sm">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-3 bg-accent text-paper py-5 border-4 border-ink font-bold text-lg tracking-[0.2em] shadow-[8px_8px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <RotateCcw size={20} />
                Reboot System
              </button>
              
              {!isQuotaError && (
                <p className="text-[10px] text-ink-muted text-center font-bold tracking-widest mt-4">
                  If the issue persists, please check your database configuration or contact support.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
