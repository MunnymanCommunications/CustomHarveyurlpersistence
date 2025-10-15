import { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  // FIX: Initializing state in the constructor for broader compatibility.
  // Class field properties can sometimes cause issues with older tooling,
  // potentially leading to incorrect type inference for inherited members like `props`.
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <Icon name="error" className="w-16 h-16 text-danger mb-4" />
            <h1 className="text-2xl font-bold text-text-primary">Something went wrong.</h1>
            <p className="text-text-secondary mt-2">We've logged the issue and are looking into it. Please refresh the page to try again.</p>
            {this.state.error && (
                <details className="mt-4 text-left bg-base-medium p-3 rounded-lg max-w-lg w-full">
                    <summary className="cursor-pointer font-semibold">Error Details</summary>
                    <pre className="mt-2 text-xs text-danger whitespace-pre-wrap overflow-x-auto">
                        {this.state.error.stack}
                    </pre>
                </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-brand-secondary-glow text-on-brand font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105"
            >
                Refresh Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}
