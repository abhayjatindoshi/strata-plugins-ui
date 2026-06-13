import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useWizardHost, type UseWizardOptions, type WizardHostHandle } from '@/wizard/use-wizard-host';
import { WizardCancelled, type Step } from '@/wizard/types';

// Lightweight radix stub: exposes open/close triggers so both onOpenChange
// branches are reachable, and renders content only while open (like radix).
vi.mock('@radix-ui/react-dialog', () => {
  const Root = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    children: ReactNode;
  }) => (
    <div data-open={String(open)}>
      <button type="button" data-testid="radix-open" onClick={() => onOpenChange(true)} />
      <button type="button" data-testid="radix-close" onClick={() => onOpenChange(false)} />
      {open ? children : null}
    </div>
  );
  const Portal = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Overlay = (props: Record<string, unknown>) => <div {...props} />;
  const Content = ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>;
  const Title = ({ children, ...props }: { children: ReactNode }) => <h2 {...props}>{children}</h2>;
  const Close = ({ children }: { children: ReactNode }) => <>{children}</>;
  return { Root, Portal, Overlay, Content, Title, Close };
});

const providerTheme = { color: '#abc' };

let handle: WizardHostHandle;
function Host(props: UseWizardOptions) {
  handle = useWizardHost(props);
  return <>{handle.element}</>;
}

type Captured = { onComplete?: (v: unknown) => void; onCancel?: () => void };

function makeStep(theme: 'app' | 'provider', value: unknown, captured: Captured): Step<unknown> {
  return {
    id: 's',
    theme,
    render: ({ onComplete, onCancel }) => {
      captured.onComplete = onComplete;
      captured.onCancel = onCancel;
      return (
        <div>
          <span>step-body</span>
          <button type="button" data-testid="step-complete" onClick={() => onComplete(value)}>
            done
          </button>
          <button type="button" data-testid="step-cancel" onClick={onCancel}>
            x
          </button>
        </div>
      );
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useWizardHost', () => {
  it('starts closed and renders no content', () => {
    render(<Host providerTheme={providerTheme} />);
    expect(handle.isOpen).toBe(false);
    expect(screen.queryByText('step-body')).not.toBeInTheDocument();
  });

  it('opens, runs a single app-theme step, and resolves on complete', async () => {
    render(<Host providerTheme={providerTheme} />);
    const captured: Captured = {};
    const step = makeStep('app', 'result-value', captured);

    act(() => {
      handle.open();
    });
    expect(handle.isOpen).toBe(true);

    let result: Promise<unknown>;
    act(() => {
      result = handle.controller.runStep(step);
    });
    expect(screen.getByText('step-body')).toBeInTheDocument();
    // single step → no counter
    expect(document.querySelector('[data-slot="wizard-counter"]')).toBeNull();

    fireEvent.click(screen.getByTestId('step-complete'));
    await expect(result!).resolves.toBe('result-value');
    expect(screen.queryByText('step-body')).not.toBeInTheDocument();

    // Completing again with no active step is a no-op.
    expect(() => captured.onComplete?.('again')).not.toThrow();
  });

  it('shows a counter, title and class names with an estimated total > 1', () => {
    const counter = vi.fn((c: number, t: number) => `${c}/${t}`);
    render(
      <Host
        providerTheme={providerTheme}
        title="My Wizard"
        labels={{ counter, back: 'B', cancel: 'X' }}
        classNames={{ overlay: 'ov', content: 'ct', header: 'hd', title: 'ti', counter: 'co', cancel: 'ca', body: 'bd' }}
      />,
    );
    const captured: Captured = {};
    act(() => {
      handle.open();
      handle.controller.setEstimatedTotal(3);
    });
    act(() => {
      void handle.controller.runStep(makeStep('app', null, captured));
    });
    expect(screen.getByText('My Wizard')).toBeInTheDocument();
    const counterEl = document.querySelector('[data-slot="wizard-counter"]');
    expect(counterEl).toHaveTextContent('1/3');
    expect(counter).toHaveBeenCalledWith(1, 3);
  });

  it('uses the default counter label when none is supplied', () => {
    render(<Host providerTheme={providerTheme} />);
    const captured: Captured = {};
    act(() => {
      handle.open();
      handle.controller.setEstimatedTotal(2);
    });
    act(() => {
      void handle.controller.runStep(makeStep('app', null, captured));
    });
    expect(document.querySelector('[data-slot="wizard-counter"]')).toHaveTextContent('1 of 2');
  });

  it('wraps provider-theme steps in the provider theme', () => {
    render(<Host providerTheme={providerTheme} />);
    const captured: Captured = {};
    act(() => {
      handle.open();
    });
    act(() => {
      void handle.controller.runStep(makeStep('provider', null, captured));
    });
    expect(document.querySelector('[data-fyredb-provider-theme]')).not.toBeNull();
    expect(screen.getByText('step-body')).toBeInTheDocument();
  });

  it('cancels via onOpenChange(false), rejecting the step and calling onClose', async () => {
    const onClose = vi.fn();
    render(<Host providerTheme={providerTheme} onClose={onClose} />);
    const captured: Captured = {};
    act(() => {
      handle.open();
    });
    let result: Promise<unknown>;
    act(() => {
      result = handle.controller.runStep(makeStep('app', null, captured));
    });
    fireEvent.click(screen.getByTestId('radix-close'));
    await expect(result!).rejects.toBeInstanceOf(WizardCancelled);
    expect(onClose).toHaveBeenCalled();
    expect(handle.isOpen).toBe(false);
  });

  it('cancels via the step onCancel handler', async () => {
    render(<Host providerTheme={providerTheme} />);
    const captured: Captured = {};
    act(() => {
      handle.open();
    });
    let result: Promise<unknown>;
    act(() => {
      result = handle.controller.runStep(makeStep('app', null, captured));
    });
    fireEvent.click(screen.getByTestId('step-cancel'));
    await expect(result!).rejects.toBeInstanceOf(WizardCancelled);
  });

  it('opens through onOpenChange(true)', () => {
    render(<Host providerTheme={providerTheme} />);
    expect(handle.isOpen).toBe(false);
    fireEvent.click(screen.getByTestId('radix-open'));
    expect(handle.isOpen).toBe(true);
  });

  it('close() is a no-op reject path when no step is active', () => {
    const onClose = vi.fn();
    render(<Host providerTheme={providerTheme} onClose={onClose} />);
    act(() => {
      handle.open();
    });
    act(() => {
      handle.close();
    });
    expect(handle.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });
});
