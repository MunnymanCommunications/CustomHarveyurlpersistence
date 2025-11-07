import { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import { logEvent } from '../lib/logger.ts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  // FIX: Switched to class property syntax for state initialization.
  // The constructor-based initialization was causing TypeScript errors where `this.state`
  // and `this.props` were not recognized on the component instance. This modern syntax
  // correctly defines and initializes the state.
  state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    logEvent('FATAL_ERROR', {
      metadata: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-base-light dark:bg-dark-base-light">
            <Icon name="error" className="w-16 h-16 text-danger mb-4" />
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Something went wrong.</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2">We've logged the issue and are looking into it. Please refresh the page to try again.</p>
            {this.state.error && (
                <details className="mt-4 text-left bg-base-medium dark:bg-dark-base-medium p-3 rounded-lg max-w-lg w-full">
                    <summary className="cursor-pointer font-semibold text-text-primary dark:text-dark-text-primary">Error Details</summary>
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
