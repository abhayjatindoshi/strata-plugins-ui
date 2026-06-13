import { vi } from 'vitest';
import * as mod from '@/react/fyredb-provider';
import { runProviderSuite, type ProviderModule } from './provider-suite';

const { ctorSpy, disposeSpy } = vi.hoisted(() => ({ ctorSpy: vi.fn(), disposeSpy: vi.fn() }));

vi.mock('@fyre-db/core', () => ({
  FyreDb: class {
    constructor(opts: unknown) {
      ctorSpy(opts);
    }
    dispose() {
      disposeSpy();
      return Promise.resolve();
    }
  },
}));

vi.mock('@fyre-db/plugins', () => ({
  FyreDbPluginConfigError: class extends Error {
    constructor(message?: string) {
      super(message);
      this.name = 'FyreDbPluginConfigError';
    }
  },
}));

// The provider module is structurally compatible with ProviderModule.
runProviderSuite('FyreDbProvider (fyredb-provider)', mod as unknown as ProviderModule, { ctorSpy, disposeSpy });
