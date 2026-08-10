import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { devLogger } from '../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: 'Something went wrong. Please refresh the page.' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: import.meta.env.DEV ? error.toString() : 'Something went wrong. Please refresh the page.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    devLogger.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {this.state.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
