import React from 'react';

/**
 * Global error boundary — catches any uncaught render / lifecycle error
 * in the subtree and shows a recovery UI instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 *
 * Accepts an optional `fallback` prop for a custom error UI.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production you'd send this to an error reporting service.
    console.error('[ErrorBoundary] Caught an uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Allow parent to supply a custom fallback UI
    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
        : this.props.fallback;
    }

    const { error } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border, #e2e8f0)',
            borderLeft: '4px solid #ef4444',
            borderRadius: 12,
            padding: '2rem 2.5rem',
            maxWidth: 520,
            width: '100%',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-primary, #0f172a)',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: 14,
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.6,
            }}
          >
            This page encountered an unexpected error. Your other tabs and data
            are unaffected.
          </p>

          {isDev && error && (
            <details
              style={{
                textAlign: 'left',
                marginBottom: '1.5rem',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: '#7f1d1d',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <summary style={{ fontWeight: 700, cursor: 'pointer', marginBottom: 6 }}>
                Error details (dev only)
              </summary>
              <strong>{error.toString()}</strong>
              {this.state.errorInfo?.componentStack && (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </details>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ fontSize: 13 }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/Clarity/dashboard')}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
