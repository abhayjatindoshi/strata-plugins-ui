import { BehaviorSubject, distinctUntilChanged, type Observable, type Subscription } from 'rxjs';
import type { Tenant } from '@fyre-db/core';
import { FyreDbPluginConfigError } from '@fyre-db/plugins';
import type { CloudProvider, ProviderOp } from './provider';

export type PlacedOp = {
  readonly provider: CloudProvider;
  readonly op: ProviderOp;
};

/**
 * Aggregates cloud providers and tracks the active one based on the
 * `FyreDbApp`'s `provider$` (active provider name). Provides helpers for op
 * placement lookups.
 */
export class CloudProviderService {
  private readonly byName: ReadonlyMap<string, CloudProvider>;
  private readonly activeProvider$$: BehaviorSubject<CloudProvider | null>;
  private readonly sub: Subscription;

  readonly activeProvider$: Observable<CloudProvider | null>;
  readonly all: readonly CloudProvider[];

  constructor(
    providers: readonly CloudProvider[],
    provider$: Observable<string | null>,
  ) {
    const byName = new Map<string, CloudProvider>();
    for (const p of providers) {
      if (byName.has(p.name)) throw new FyreDbPluginConfigError(`CloudProviderService: duplicate provider name "${p.name}"`);
      byName.set(p.name, p);
    }
    this.byName = byName;
    this.all = [...providers];
    this.activeProvider$$ = new BehaviorSubject<CloudProvider | null>(null);
    this.activeProvider$ = this.activeProvider$$.pipe(distinctUntilChanged());

    this.sub = provider$.subscribe((name) => {
      this.activeProvider$$.next(name ? byName.get(name) ?? null : null);
    });
  }

  get activeProvider(): CloudProvider | null {
    return this.activeProvider$$.getValue();
  }

  get(name: string): CloudProvider | undefined {
    return this.byName.get(name);
  }

  pageActions(): readonly PlacedOp[] {
    const provider = this.activeProvider;
    if (!provider) return [];
    return provider.ops.filter((o) => o.placement === 'page-action').map((o) => ({ provider, op: o }));
  }

  tenantActions(_tenant: Tenant): readonly PlacedOp[] {
    const provider = this.activeProvider;
    if (!provider) return [];
    return provider.ops.filter((o) => o.placement === 'tenant-action').map((o) => ({ provider, op: o }));
  }

  tenantMenu(_tenant: Tenant): readonly PlacedOp[] {
    const provider = this.activeProvider;
    if (!provider) return [];
    return provider.ops.filter((o) => o.placement === 'tenant-menu').map((o) => ({ provider, op: o }));
  }

  dispose(): void {
    this.sub.unsubscribe();
  }
}
