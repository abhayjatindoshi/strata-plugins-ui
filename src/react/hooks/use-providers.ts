import type { ProviderModule } from 'strata-adapters';
import { useStrata } from './use-strata';

export function useProviders(): readonly ProviderModule[] {
  return useStrata().authService?.providers ?? [];
}
