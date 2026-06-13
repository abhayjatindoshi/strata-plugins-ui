import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepErrorBoundary } from '@/wizard/step-error-boundary';

function Boom({ shouldThrow }: { readonly shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('kaboom');
  return <span>safe-child</span>;
}

describe('StepErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <StepErrorBoundary>
        <span>ok-child</span>
      </StepErrorBoundary>,
    );
    expect(screen.getByText('ok-child')).toBeInTheDocument();
  });

  it('renders the default fallback when a child throws and logs the error', () => {
    render(
      <StepErrorBoundary>
        <Boom shouldThrow />
      </StepErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('resets via the default fallback button', () => {
    function Harness() {
      // After reset the child no longer throws.
      return (
        <StepErrorBoundary>
          <ResettableBoom />
        </StepErrorBoundary>
      );
    }
    let throwNow = true;
    function ResettableBoom() {
      if (throwNow) throw new Error('first');
      return <span>recovered</span>;
    }

    render(<Harness />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    throwNow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('renders a custom fallback and exposes reset', () => {
    const fallback = vi.fn((error: Error, reset: () => void) => (
      <div>
        <span>custom: {error.message}</span>
        <button type="button" onClick={reset}>
          retry-custom
        </button>
      </div>
    ));

    let throwNow = true;
    function ResettableBoom() {
      if (throwNow) throw new Error('boom-msg');
      return <span>custom-recovered</span>;
    }

    render(
      <StepErrorBoundary fallback={fallback}>
        <ResettableBoom />
      </StepErrorBoundary>,
    );

    expect(screen.getByText('custom: boom-msg')).toBeInTheDocument();
    throwNow = false;
    fireEvent.click(screen.getByRole('button', { name: 'retry-custom' }));
    expect(screen.getByText('custom-recovered')).toBeInTheDocument();
  });
});
