import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Global error log accessible to DebugConsole
export const errorLog: Array<{ time: string; message: string; stack?: string }> = [];

export function pushError(message: string, stack?: string) {
  errorLog.push({ time: new Date().toLocaleTimeString(), message, stack });
  if (errorLog.length > 50) errorLog.shift();
}

// Capture global errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    pushError(`[error] ${e.message}`, e.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    pushError(`[unhandled rejection] ${msg}`, e.reason?.stack);
  });
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    pushError(`[react error] ${error.message}`, error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    pushError(`[react componentDidCatch] ${error.message}\n${info.componentStack}`, error.stack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg, #0a0a0a)',
          padding: 32, gap: 16,
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text, #fff)', textAlign: 'center' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-3, #666)', textAlign: 'center', maxWidth: 300 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: 8, padding: '12px 28px',
              background: '#F97316', color: '#fff',
              border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
