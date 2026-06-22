import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { encryptionSetupStep } from '@/steps/encryption-setup-step';

vi.mock('@/react/fyredb-app-provider', () => ({
  useFyreDbAppContext: () => ({
    tenantLabels: { lower: 'household', sentence: 'Household', upper: 'HOUSEHOLD' },
  }),
}));

function renderStep(onComplete = vi.fn(), onCancel = vi.fn(), opts = {}) {
  const step = encryptionSetupStep(opts);
  render(<>{step.render({ onComplete, onCancel })}</>);
  return { step, onComplete, onCancel };
}

describe('encryptionSetupStep', () => {
  it('builds a step descriptor with id and theme', () => {
    const step = encryptionSetupStep();
    expect(step.id).toBe('encryption-setup');
    expect(step.theme).toBe('app');
  });

  it('applies mode and provider className', () => {
    renderStep(vi.fn(), vi.fn(), { mode: 'dark', theme: { color: '#000', className: 'brand-x' } });
    const form = document.querySelector('[data-step="encryption-setup"]') as HTMLElement;
    expect(form).toHaveAttribute('data-theme', 'dark');
    expect(form).toHaveClass('brand-x');
  });

  it('completes with null when encryption stays disabled', () => {
    const { onComplete } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onComplete).toHaveBeenCalledWith(null);
  });

  it('reveals password fields and completes with the password when matching', () => {
    const { onComplete } = renderStep();
    fireEvent.click(screen.getByRole('checkbox'));
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'secret' } });
    fireEvent.change(inputs[1], { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onComplete).toHaveBeenCalledWith('secret');
  });

  it('shows a mismatch error and blocks submit when passwords differ', () => {
    const { onComplete } = renderStep();
    fireEvent.click(screen.getByRole('checkbox'));
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'a' } });
    fireEvent.change(inputs[1], { target: { value: 'b' } });
    // canSubmit is false, so submit the form directly to exercise handleSubmit mismatch branch.
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears password fields when encryption is toggled back off', () => {
    renderStep();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'a' } });
    fireEvent.change(inputs[1], { target: { value: 'b' } });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    fireEvent.click(checkbox); // toggle off → clears state
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(0);
    fireEvent.click(checkbox); // back on → fields empty again
    const cleared = document.querySelectorAll('input[type="password"]');
    expect((cleared[0] as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
  });

  it('invokes onCancel', () => {
    const { onCancel } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
