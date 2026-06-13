import { describe, it, expect, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import type { Tenant } from '@fyre-db/core';
import type { CloudService } from '@fyre-db/plugins';
import { CloudProviderService } from '@/tenants/cloud-provider-service';
import { FyreDbPluginConfigError } from '@fyre-db/plugins';
import type { CloudProvider, OpPlacement, ProviderOp } from '@/tenants/provider';

vi.mock('@fyre-db/plugins', () => ({
  FyreDbPluginConfigError: class FyreDbPluginConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FyreDbPluginConfigError';
    }
  },
}));

type FakeAdapter = { readonly name: string };

function makeOp(name: string, placement: OpPlacement): ProviderOp {
  return { name, label: name, placement, run: () => Promise.resolve() };
}

function makeProvider(name: string, ops: readonly ProviderOp[] = []): CloudProvider {
  return { name, label: name, theme: { color: '#123456' }, ops };
}

function makeCloud(subject: BehaviorSubject<FakeAdapter | null>): CloudService {
  // CloudProviderService only reads `active$`; a minimal stand-in avoids
  // constructing the full CloudService. Cast is required to satisfy the type.
  return { active$: subject } as unknown as CloudService;
}

// CloudProviderService never reads the tenant argument; a minimal value suffices.
const fakeTenant = { id: 't-1' } as unknown as Tenant;

describe('CloudProviderService', () => {
  it('throws on duplicate provider names', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    expect(() => new CloudProviderService([makeProvider('a'), makeProvider('a')], makeCloud(subject))).toThrow(
      FyreDbPluginConfigError,
    );
  });

  it('exposes all providers and lookup by name', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const a = makeProvider('a');
    const b = makeProvider('b');
    const svc = new CloudProviderService([a, b], makeCloud(subject));

    expect(svc.all).toEqual([a, b]);
    expect(svc.get('a')).toBe(a);
    expect(svc.get('missing')).toBeUndefined();
  });

  it('tracks the active provider from cloud.active$', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const gdrive = makeProvider('gdrive');
    const svc = new CloudProviderService([gdrive], makeCloud(subject));

    expect(svc.activeProvider).toBeNull();

    subject.next({ name: 'gdrive' });
    expect(svc.activeProvider).toBe(gdrive);

    subject.next(null);
    expect(svc.activeProvider).toBeNull();
  });

  it('maps an unknown adapter name to null', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const svc = new CloudProviderService([makeProvider('gdrive')], makeCloud(subject));

    subject.next({ name: 'unknown' });
    expect(svc.activeProvider).toBeNull();
  });

  it('emits distinct active providers on activeProvider$', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const gdrive = makeProvider('gdrive');
    const svc = new CloudProviderService([gdrive], makeCloud(subject));

    const seen: Array<CloudProvider | null> = [];
    const sub = svc.activeProvider$.subscribe((p) => seen.push(p));

    subject.next({ name: 'gdrive' });
    subject.next({ name: 'gdrive' }); // duplicate — suppressed by distinctUntilChanged
    subject.next(null);

    sub.unsubscribe();
    expect(seen).toEqual([null, gdrive, null]);
  });

  it('returns empty placements when no provider is active', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const svc = new CloudProviderService([makeProvider('gdrive')], makeCloud(subject));

    expect(svc.pageActions()).toEqual([]);
    expect(svc.tenantActions(fakeTenant)).toEqual([]);
    expect(svc.tenantMenu(fakeTenant)).toEqual([]);
  });

  it('filters ops by placement for the active provider', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const page = makeOp('page', 'page-action');
    const tenantAction = makeOp('t-action', 'tenant-action');
    const tenantMenu = makeOp('t-menu', 'tenant-menu');
    const gdrive = makeProvider('gdrive', [page, tenantAction, tenantMenu]);
    const svc = new CloudProviderService([gdrive], makeCloud(subject));

    subject.next({ name: 'gdrive' });

    expect(svc.pageActions()).toEqual([{ provider: gdrive, op: page }]);
    expect(svc.tenantActions(fakeTenant)).toEqual([{ provider: gdrive, op: tenantAction }]);
    expect(svc.tenantMenu(fakeTenant)).toEqual([{ provider: gdrive, op: tenantMenu }]);
  });

  it('stops tracking after dispose()', () => {
    const subject = new BehaviorSubject<FakeAdapter | null>(null);
    const gdrive = makeProvider('gdrive');
    const svc = new CloudProviderService([gdrive], makeCloud(subject));

    svc.dispose();
    subject.next({ name: 'gdrive' });
    expect(svc.activeProvider).toBeNull();
  });
});
