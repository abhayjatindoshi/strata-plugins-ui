import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginButtons } from '@/login/login-buttons';

// ── Mocks ────────────────────────────────────────────────
vi.mock('@fyre-db/plugins', () => ({
  FyreDbPluginConfigError: class FyreDbPluginConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FyreDbPluginConfigError';
    }
  },
}));

type LoginButtonMockProps = {
  readonly provider: string;
  readonly theme?: string;
  readonly variant?: string;
  readonly onClick?: () => void;
};
vi.mock('@/react/components/login-button', () => ({
  LoginButton: ({ provider, theme, variant, onClick }: LoginButtonMockProps) => (
    <button type="button" data-testid={`brand-${provider}`} data-theme={theme} data-variant={variant} onClick={onClick}>
      {provider}
    </button>
  ),
}));

let mockConfig: { auth?: unknown };
vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({ config: mockConfig }),
}));

// ── Fixtures ─────────────────────────────────────────────
type Auth = { name: string; login: () => Promise<void> };
function makeAuthService(supported: Auth[]) {
  return { supportedAuths: () => supported };
}

beforeEach(() => {
  mockConfig = { auth: undefined };
});

describe('LoginButtons', () => {
  it('throws when no auth service is available', () => {
    expect(() => render(<LoginButtons />)).toThrow(/no ClientAuthService/);
  });

  it('returns null when no auths are supported', () => {
    const { container } = render(<LoginButtons authService={makeAuthService([]) as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders branded google and microsoft buttons and a generic fallback', async () => {
    const user = userEvent.setup();
    const google: Auth = { name: 'google', login: vi.fn(() => Promise.resolve()) };
    const microsoft: Auth = { name: 'microsoft', login: vi.fn(() => Promise.resolve()) };
    const apple: Auth = { name: 'apple', login: vi.fn(() => Promise.resolve()) };

    render(
      <LoginButtons
        authService={makeAuthService([google, microsoft, apple]) as never}
        mode="dark"
        variant="icon"
        className="wrap"
        buttonClassName="btn"
      />,
    );

    const googleBtn = screen.getByTestId('brand-google');
    expect(googleBtn).toHaveAttribute('data-theme', 'dark');
    expect(googleBtn).toHaveAttribute('data-variant', 'icon');
    expect(screen.getByTestId('brand-microsoft')).toBeInTheDocument();
    expect(screen.getByText('Sign in with apple')).toBeInTheDocument();

    await user.click(googleBtn);
    expect(google.login).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('brand-microsoft'));
    expect(microsoft.login).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Sign in with apple'));
    expect(apple.login).toHaveBeenCalledTimes(1);
  });

  it('falls back to the auth service from context', () => {
    mockConfig = { auth: makeAuthService([{ name: 'google', login: vi.fn(() => Promise.resolve()) }]) };
    render(<LoginButtons />);
    expect(screen.getByTestId('brand-google')).toBeInTheDocument();
  });
});
