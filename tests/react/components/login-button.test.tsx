import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginButton } from '@/react/components/login-button';

vi.mock('@/google/google-login-button', () => ({
  GoogleLoginButton: (props: { readonly theme?: string }) => (
    <button data-testid="google" data-theme={props.theme}>
      google
    </button>
  ),
}));

vi.mock('@/microsoft/microsoft-login-button', () => ({
  MicrosoftLoginButton: (props: { readonly theme?: string }) => (
    <button data-testid="microsoft" data-theme={props.theme}>
      microsoft
    </button>
  ),
}));

describe('LoginButton', () => {
  it('renders the Google branded button and forwards props', () => {
    render(<LoginButton provider="google" theme="dark" />);
    const btn = screen.getByTestId('google');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-theme', 'dark');
  });

  it('renders the Microsoft branded button', () => {
    render(<LoginButton provider="microsoft" />);
    expect(screen.getByTestId('microsoft')).toBeInTheDocument();
  });

  it('throws for an unknown provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error intentionally passing an invalid provider to hit the exhaustive default branch
    expect(() => render(<LoginButton provider="apple" />)).toThrow(/no branded component for provider: apple/);
    vi.restoreAllMocks();
  });
});
