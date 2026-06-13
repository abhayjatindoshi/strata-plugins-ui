import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TenantGuard } from '@/react/guards/tenant-guard';

type TenantState = {
  active: { id: string } | undefined;
  status: string;
  error: Error | null;
  requestOpen: ReturnType<typeof vi.fn>;
};

let tenantState: TenantState;
let ctxConfig: unknown;
let authName: string | undefined;

vi.mock('@/react/tenant-provider', () => ({
  useTenant: () => tenantState,
}));
vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({ config: ctxConfig }),
  useAuth: () => ({ name: authName }),
}));

const stepRender = vi.fn(
  ({ onComplete, onCancel }: { onComplete: (pw: string) => void; onCancel: () => void }) => (
    <div>
      <span>unlock-step</span>
      <button type="button" data-testid="complete" onClick={() => onComplete('pw')}>
        complete
      </button>
      <button type="button" data-testid="cancel" onClick={onCancel}>
        cancel
      </button>
    </div>
  ),
);

const CRED_MSG = 'Credential required for encrypted tenant';

function configWithStep(step: unknown = { id: 'u', theme: 'app', render: stepRender }) {
  return {
    commonSteps: { encryptionUnlock: vi.fn(() => step) },
    providers: { all: [{ name: 'google', theme: { color: '#g' } }] },
  };
}

beforeEach(() => {
  tenantState = { active: undefined, status: 'loading', error: null, requestOpen: vi.fn() };
  ctxConfig = configWithStep();
  authName = undefined;
  stepRender.mockClear();
});

describe('TenantGuard', () => {
  it('redirects and renders loading when no tenantId is supplied', () => {
    const onUnauthenticated = vi.fn();
    render(
      <TenantGuard tenantId={undefined} onUnauthenticated={onUnauthenticated} loading={<span>loading…</span>}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(onUnauthenticated).toHaveBeenCalled();
    expect(tenantState.requestOpen).not.toHaveBeenCalled();
    expect(screen.getByText('loading…')).toBeInTheDocument();
  });

  it('requests open on mount and renders children when hydrated for the tenant', () => {
    tenantState = { active: { id: 't1' }, status: 'hydrated', error: null, requestOpen: vi.fn() };
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(tenantState.requestOpen).toHaveBeenCalledWith('t1');
    expect(screen.getByText('kids')).toBeInTheDocument();
  });

  it('renders loading (default null) while not yet hydrated', () => {
    tenantState = { active: undefined, status: 'loading', error: null, requestOpen: vi.fn() };
    const { container } = render(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(screen.queryByText('kids')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('redirects on a non-credential error', () => {
    const onUnauthenticated = vi.fn();
    tenantState = { active: undefined, status: 'error', error: new Error('disk full'), requestOpen: vi.fn() };
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={onUnauthenticated}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(onUnauthenticated).toHaveBeenCalled();
  });

  it('shows the unlock step for a credential error and themes it from the auth provider', () => {
    authName = 'google';
    const requestOpen = vi.fn();
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen };
    const config = configWithStep();
    ctxConfig = config;
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()} mode="dark">
        <span>kids</span>
      </TenantGuard>,
    );
    expect(screen.getByText('unlock-step')).toBeInTheDocument();
    expect(config.commonSteps.encryptionUnlock).toHaveBeenCalledWith({ mode: 'dark', theme: { color: '#g' } });

    fireEvent.click(screen.getByTestId('complete'));
    expect(requestOpen).toHaveBeenCalledWith('t1', { credential: 'pw' });
    expect(screen.queryByText('unlock-step')).not.toBeInTheDocument();
  });

  it('omits the provider theme when there is no auth name', () => {
    authName = undefined;
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen: vi.fn() };
    const config = configWithStep();
    ctxConfig = config;
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(config.commonSteps.encryptionUnlock).toHaveBeenCalledWith({ mode: undefined, theme: undefined });
  });

  it('cancelling the unlock step redirects', () => {
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen: vi.fn() };
    const onUnauthenticated = vi.fn();
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={onUnauthenticated}>
        <span>kids</span>
      </TenantGuard>,
    );
    fireEvent.click(screen.getByTestId('cancel'));
    expect(onUnauthenticated).toHaveBeenCalled();
  });

  it('redirects when a credential is needed but no unlock step is produced', () => {
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen: vi.fn() };
    const onUnauthenticated = vi.fn();
    ctxConfig = { commonSteps: { encryptionUnlock: vi.fn(() => undefined) } };
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={onUnauthenticated}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(onUnauthenticated).toHaveBeenCalled();
  });

  it('redirects when commonSteps is missing entirely', () => {
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen: vi.fn() };
    const onUnauthenticated = vi.fn();
    ctxConfig = {};
    render(
      <TenantGuard tenantId="t1" onUnauthenticated={onUnauthenticated}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(onUnauthenticated).toHaveBeenCalled();
  });

  it('clears the unlock step when the status leaves error', () => {
    tenantState = { active: undefined, status: 'error', error: new Error(CRED_MSG), requestOpen: vi.fn() };
    const { rerender } = render(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(screen.getByText('unlock-step')).toBeInTheDocument();

    act(() => {
      tenantState = { active: { id: 't1' }, status: 'hydrated', error: null, requestOpen: tenantState.requestOpen };
    });
    rerender(
      <TenantGuard tenantId="t1" onUnauthenticated={vi.fn()}>
        <span>kids</span>
      </TenantGuard>,
    );
    expect(screen.queryByText('unlock-step')).not.toBeInTheDocument();
    expect(screen.getByText('kids')).toBeInTheDocument();
  });
});
