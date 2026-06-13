import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GoogleLoginButton } from '@/google/google-login-button';

type Listener = () => void;

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let listener: Listener | undefined;
  const mq = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, l: Listener) => { listener = l; },
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn(() => mq) as unknown as typeof window.matchMedia;
  return {
    fire(next: boolean) {
      matches = next;
      act(() => { listener?.(); });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GoogleLoginButton', () => {
  it('renders the pill variant with the default label', () => {
    render(<GoogleLoginButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('data-gsi-variant', 'pill');
    expect(btn).toHaveAttribute('data-gsi-theme', 'light');
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders the icon variant with an aria-label and no text', () => {
    render(<GoogleLoginButton variant="icon" />);
    const btn = screen.getByRole('button', { name: 'Sign in with Google' });
    expect(btn).toHaveAttribute('data-gsi-variant', 'icon');
    expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
  });

  it('uses string children as the label and forwards className', () => {
    render(<GoogleLoginButton className="extra">Continue</GoogleLoginButton>);
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByRole('button').className).toContain('extra');
  });

  it('honors an explicit dark theme', () => {
    render(<GoogleLoginButton theme="dark" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-gsi-theme', 'dark');
  });

  it('resolves the auto theme against prefers-color-scheme', () => {
    const mq = mockMatchMedia(false);
    render(<GoogleLoginButton theme="auto" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-gsi-theme', 'light');
    mq.fire(true);
    expect(screen.getByRole('button')).toHaveAttribute('data-gsi-theme', 'dark');
  });
});
