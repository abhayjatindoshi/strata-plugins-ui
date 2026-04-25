import { createContext, useContext, type ReactNode } from 'react';
import type { ProviderTheme } from '../tenants/provider';

const ProviderThemeContext = createContext<ProviderTheme | null>(null);

/**
 * Wraps step bodies whose `theme === 'provider'` so brand colors apply via
 * CSS variables. Inner components can read the theme with `useProviderTheme`
 * or via the `--strata-provider-color` / `--strata-provider-accent` CSS vars
 * exposed on the wrapper.
 */
export function ProviderThemeProvider({
  theme,
  children,
}: {
  readonly theme: ProviderTheme;
  readonly children: ReactNode;
}) {
  return (
    <ProviderThemeContext.Provider value={theme}>
      <div
        data-strata-provider-theme=""
        style={{
          ['--strata-provider-color' as string]: theme.color,
          ['--strata-provider-accent' as string]: theme.accent ?? theme.color,
        }}
      >
        {children}
      </div>
    </ProviderThemeContext.Provider>
  );
}

/** Returns the active provider theme, or `null` outside a provider scope. */
export function useProviderTheme(): ProviderTheme | null {
  return useContext(ProviderThemeContext);
}
