import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  readonly fallback?: (error: Error, reset: () => void) => ReactNode;
  readonly children: ReactNode;
};

type State = {
  readonly error: Error | null;
};

/**
 * Lightweight error boundary for wizard steps.
 * Catches render errors and displays a fallback UI with a retry option.
 */
export class StepErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Wizard step render error:', error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div data-slot="step-error-boundary">
          <p>Something went wrong.</p>
          <button type="button" onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
