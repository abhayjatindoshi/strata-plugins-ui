import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MicrosoftLoginButton } from '@/microsoft/microsoft-login-button';

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

describe('MicrosoftLoginButton', () => {
  it('renders the pill variant with the default label', () => {
    render(<MicrosoftLoginButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('data-ms-variant', 'pill');
    expect(btn).toHaveAttribute('data-ms-theme', 'light');
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
  });

  it('renders the icon variant with an aria-label and no text', () => {
    render(<MicrosoftLoginButton variant="icon" />);
    const btn = screen.getByRole('button', { name: 'Sign in with Microsoft' });
    expect(btn).toHaveAttribute('data-ms-variant', 'icon');
    expect(screen.queryByText('Sign in with Microsoft')).not.toBeInTheDocument();
  });

  it('uses string children as the label and forwards className', () => {
    render(<MicrosoftLoginButton className="extra">Continue</MicrosoftLoginButton>);
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByRole('button').className).toContain('extra');
  });

  it('honors an explicit dark theme', () => {
    render(<MicrosoftLoginButton theme="dark" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-ms-theme', 'dark');
  });

  it('resolves the auto theme against prefers-color-scheme', () => {
    const mq = mockMatchMedia(false);
    render(<MicrosoftLoginButton theme="auto" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-ms-theme', 'light');
    mq.fire(true);
    expect(screen.getByRole('button')).toHaveAttribute('data-ms-theme', 'dark');
  });
});
