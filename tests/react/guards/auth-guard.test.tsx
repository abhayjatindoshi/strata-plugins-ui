import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '@/react/guards/auth-guard';

const useAuthMock = vi.fn();
vi.mock('@/react/fyredb-provider', () => ({
  useAuth: () => useAuthMock(),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('renders the loading node while auth is loading', () => {
    useAuthMock.mockReturnValue({ status: 'loading' });
    const onUnauthenticated = vi.fn();
    render(
      <AuthGuard onUnauthenticated={onUnauthenticated} loading={<span>loading…</span>}>
        <span>secret</span>
      </AuthGuard>,
    );
    expect(screen.getByText('loading…')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });

  it('renders children when signed in', () => {
    useAuthMock.mockReturnValue({ status: 'signed-in' });
    render(
      <AuthGuard onUnauthenticated={vi.fn()}>
        <span>secret</span>
      </AuthGuard>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('redirects and renders loading when signed out', () => {
    useAuthMock.mockReturnValue({ status: 'signed-out' });
    const onUnauthenticated = vi.fn();
    render(
      <AuthGuard onUnauthenticated={onUnauthenticated}>
        <span>secret</span>
      </AuthGuard>,
    );
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
