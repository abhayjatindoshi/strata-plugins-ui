import { createContext } from 'react';
import type { Strata, Tenant } from 'strata-data-sync';
import type { AuthState } from 'strata-adapters';
import type { AuthService } from 'strata-adapters';

export type StrataContextValue = {
  readonly strata: Strata | null;
  readonly authState: AuthState;
  readonly authService: AuthService | null;
};

export const StrataContext = createContext<StrataContextValue>({
  strata: null,
  authState: { status: 'loading' },
  authService: null,
});

export type TenantContextValue = {
  readonly tenant: Tenant | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
};

export const TenantContext = createContext<TenantContextValue>({
  tenant: undefined,
  loading: false,
  error: null,
});
