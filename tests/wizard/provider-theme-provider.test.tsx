import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderThemeProvider, useProviderTheme } from '@/wizard/provider-theme-provider';
import type { ProviderTheme } from '@/tenants/provider';

function ThemeProbe() {
  const theme = useProviderTheme();
  return <span data-testid="probe">{theme ? theme.color : 'none'}</span>;
}

describe('ProviderThemeProvider', () => {
  it('exposes the theme via context and CSS variables (accent falls back to color)', () => {
    const theme: ProviderTheme = { color: 'rgb(1, 2, 3)' };
    render(
      <ProviderThemeProvider theme={theme}>
        <ThemeProbe />
      </ProviderThemeProvider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('rgb(1, 2, 3)');
    const wrapper = document.querySelector('[data-fyredb-provider-theme]') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.getPropertyValue('--fyredb-provider-color')).toBe('rgb(1, 2, 3)');
    expect(wrapper.style.getPropertyValue('--fyredb-provider-accent')).toBe('rgb(1, 2, 3)');
  });

  it('uses an explicit accent when provided', () => {
    const theme: ProviderTheme = { color: 'red', accent: 'blue' };
    render(
      <ProviderThemeProvider theme={theme}>
        <ThemeProbe />
      </ProviderThemeProvider>,
    );

    const wrapper = document.querySelector('[data-fyredb-provider-theme]') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--fyredb-provider-color')).toBe('red');
    expect(wrapper.style.getPropertyValue('--fyredb-provider-accent')).toBe('blue');
  });

  it('returns null outside a provider scope', () => {
    render(<ThemeProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('none');
  });
});
