import { describe, it, expect } from 'vitest';
import { WizardCancelled } from '@/wizard/types';

describe('WizardCancelled', () => {
  it('uses the default message', () => {
    const err = new WizardCancelled();
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Wizard cancelled');
    expect(err.name).toBe('WizardCancelled');
  });

  it('accepts a custom message', () => {
    const err = new WizardCancelled('nope');
    expect(err.message).toBe('nope');
    expect(err.name).toBe('WizardCancelled');
  });
});
