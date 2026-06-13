import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantList } from '@/tenants/tenant-list';
import type { CloudProvider, OpPlacement, ProviderOp } from '@/tenants/provider';

// ── Mocks ────────────────────────────────────────────────
const runOp = vi.fn(() => Promise.resolve());
vi.mock('@/tenants/use-op-runner', () => ({
  useOpRunner: () => ({ wizardElement: 'WIZARD', runOp, isRunning: false }),
}));

type Tenant = { readonly id: string; readonly name: string; readonly meta: Record<string, unknown> };
type FyreConfig = {
  auth?: unknown;
  commonSteps?: unknown;
  tenantLabels: { lower: string; sentence: string; upper: string };
  providers?: { all: readonly CloudProvider[] };
};

let mockConfig: FyreConfig;
let mockTenants: readonly Tenant[];

vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({ config: mockConfig }),
}));
vi.mock('@/react/tenant-provider', () => ({
  useTenant: () => ({ all: mockTenants }),
}));

// ── Fixtures ─────────────────────────────────────────────
function makeOp(name: string, placement: OpPlacement, icon?: string): ProviderOp {
  return { name, label: `${name}-label`, placement, icon, run: () => Promise.resolve() };
}
function makeProvider(name: string, ops: readonly ProviderOp[]): CloudProvider {
  return { name, label: name, theme: { color: '#000' }, ops };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig = {
    auth: { id: 'a' },
    commonSteps: { x: 1 },
    tenantLabels: { lower: 'workspace', sentence: 'Workspace', upper: 'WORKSPACE' },
    providers: { all: [] },
  };
  mockTenants = [];
});

describe('TenantList', () => {
  it('renders nothing until auth and commonSteps are ready', () => {
    mockConfig = { ...mockConfig, auth: undefined };
    const { container } = render(<TenantList />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the default empty label derived from the tenant label', () => {
    render(<TenantList />);
    expect(screen.getByText('No workspaces yet.')).toBeInTheDocument();
    expect(screen.getByText('WIZARD')).toBeInTheDocument();
  });

  it('honors a custom empty label override', () => {
    render(<TenantList labels={{ empty: 'Nothing here' }} mode="dark" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="tenant-list"]')).toHaveAttribute('data-theme', 'dark');
  });

  it('renders a row per tenant and fires onSelect on name click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mockTenants = [{ id: 't1', name: 'Alpha', meta: { providerName: 'gdrive' } }];
    mockConfig.providers = { all: [makeProvider('gdrive', [])] };

    render(<TenantList onSelect={onSelect} />);
    await user.click(screen.getByText('Alpha'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders tenant-action and tenant-menu ops and runs them on click', async () => {
    const user = userEvent.setup();
    const action = makeOp('share', 'tenant-action', '🔗');
    const menu = makeOp('rename', 'tenant-menu');
    const page = makeOp('add', 'page-action'); // excluded from rows
    const provider = makeProvider('gdrive', [action, menu, page]);
    mockConfig.providers = { all: [provider] };
    mockTenants = [{ id: 't1', name: 'Alpha', meta: { providerName: 'gdrive' } }];

    render(<TenantList labels={{ actionLabels: { rename: 'Rename it' } }} />);

    // page-action op is not rendered in the row
    expect(screen.queryByText((c) => c.includes('add-label'))).not.toBeInTheDocument();
    // tenant-action uses icon + label fallback (icon and label are separate text nodes)
    const shareBtn = screen.getByText((c) => c.includes('share-label'));
    expect(shareBtn).toBeInTheDocument();
    // tenant-menu uses the actionLabels override
    expect(screen.getByText('Rename it')).toBeInTheDocument();

    await user.click(shareBtn);
    expect(runOp).toHaveBeenCalledWith(provider, action, mockTenants[0]);
  });

  it('renders a delete action when onDelete is provided', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    mockConfig.providers = { all: [makeProvider('gdrive', [])] };
    mockTenants = [{ id: 't1', name: 'Alpha', meta: { providerName: 'gdrive' } }];

    render(<TenantList onDelete={onDelete} labels={{ delete: 'Remove' }} />);
    await user.click(screen.getByText('Remove'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders rows with no actions when the provider is unknown', () => {
    mockConfig.providers = { all: [] };
    mockTenants = [{ id: 't1', name: 'Orphan', meta: { providerName: 'gone' } }];

    render(<TenantList />);
    expect(screen.getByText('Orphan')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="tenant-action"]')).toHaveLength(0);
  });

  it('tolerates a missing providers service', () => {
    mockConfig.providers = undefined;
    mockTenants = [{ id: 't1', name: 'Alpha', meta: { providerName: 'gdrive' } }];
    render(<TenantList />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
