import { describe, it, expect } from 'vitest';
import * as provider from '@/tenants/provider';

describe('provider module', () => {
  it('contains only type-level exports (no runtime members)', () => {
    // provider.ts is purely types/interfaces; after compilation it has no
    // executable code. Importing it here ensures the module is registered.
    expect(Object.keys(provider)).toHaveLength(0);
  });
});
