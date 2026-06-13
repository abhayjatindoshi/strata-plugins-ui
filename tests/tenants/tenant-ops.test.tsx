import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantOps } from '@/tenants/tenant-ops';
import type { CloudProvider, OpPlacement, ProviderOp } from '@/tenants/provider';

const runOp = vi.fn(() => Promise.resolve());
vi.mock('@/tenants/use-op-runner', () => ({
  useOpRunner: () => ({ wizardElement: 'WIZARD', runOp, isRunning: false }),
}));

type FyreConfig = {
  auth?: unknown;
  commonSteps?: unknown;
  providers?: { all: readonly CloudProvider[] };
};
let mockConfig: FyreConfig;

vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({ config: mockConfig }),
}));

function makeOp(name: string, placement: OpPlacement, icon?: string): ProviderOp {
  return { name, label: `${name}-label`, placement, icon, run: () => Promise.resolve() };
}
function makeProvider(name: string, ops: readonly ProviderOp[]): CloudProvider {
  return { name, label: name, theme: { color: '#000' }, ops };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig = { auth: { id: 'a' }, commonSteps: { x: 1 }, providers: { all: [] } };
});

describe('TenantOps', () => {
  it('renders nothing until ready', () => {
    mockConfig = { ...mockConfig, commonSteps: undefined };
    const { container } = render(<TenantOps />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the wizard and no buttons when there are no page actions', () => {
    render(<TenantOps mode="light" />);
    expect(screen.getByText('WIZARD')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="tenant-ops-button"]')).toHaveLength(0);
    expect(document.querySelector('[data-slot="tenant-ops"]')).toHaveAttribute('data-theme', 'light');
  });

  it('tolerates a missing providers service', () => {
    mockConfig.providers = undefined;
    render(<TenantOps />);
    expect(document.querySelectorAll('[data-slot="tenant-ops-button"]')).toHaveLength(0);
  });

  it('renders one button per page-action op and runs it on click', async () => {
    const user = userEvent.setup();
    const add = makeOp('add', 'page-action', '+');
    const join = makeOp('join', 'page-action');
    const tenantOnly = makeOp('share', 'tenant-action'); // excluded
    const provider = makeProvider('gdrive', [add, join, tenantOnly]);
    mockConfig.providers = { all: [provider] };

    render(<TenantOps labels={{ join: 'Join workspace' }} />);

    expect(screen.queryByText((c) => c.includes('share-label'))).not.toBeInTheDocument();
    // default fallback: icon + label (separate text nodes)
    const addBtn = screen.getByText((c) => c.includes('add-label'));
    expect(addBtn).toBeInTheDocument();
    // labels override
    expect(screen.getByText('Join workspace')).toBeInTheDocument();

    await user.click(addBtn);
    expect(runOp).toHaveBeenCalledWith(provider, add);
  });
});
