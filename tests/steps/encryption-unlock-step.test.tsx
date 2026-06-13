import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { encryptionUnlockStep } from '@/steps/encryption-unlock-step';

vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({
    config: { tenantLabels: { lower: 'household', sentence: 'Household', upper: 'HOUSEHOLD' } },
  }),
}));

function renderStep(onComplete = vi.fn(), onCancel = vi.fn(), opts = {}) {
  const step = encryptionUnlockStep(opts);
  render(<>{step.render({ onComplete, onCancel })}</>);
  return { step, onComplete, onCancel };
}

describe('encryptionUnlockStep', () => {
  it('builds a step descriptor with id and theme', () => {
    const step = encryptionUnlockStep();
    expect(step.id).toBe('encryption-unlock');
    expect(step.theme).toBe('app');
  });

  it('applies mode and provider className', () => {
    renderStep(vi.fn(), vi.fn(), { mode: 'light', theme: { color: '#fff', className: 'brand-y' } });
    const form = document.querySelector('[data-step="encryption-unlock"]') as HTMLElement;
    expect(form).toHaveAttribute('data-theme', 'light');
    expect(form).toHaveClass('brand-y');
  });

  it('shows a required error when submitting empty', () => {
    const { onComplete } = renderStep();
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears the error on change and completes with the password', () => {
    const { onComplete } = renderStep();
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(screen.getByText('Password is required.')).toBeInTheDocument();

    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pw' } });
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(onComplete).toHaveBeenCalledWith('pw');
  });

  it('invokes onCancel', () => {
    const { onCancel } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
