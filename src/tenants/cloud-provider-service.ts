import { BehaviorSubject, distinctUntilChanged, type Observable, type Subscription } from 'rxjs';
import type { Tenant } from '@strata/core';
import type { CloudService } from '@strata/plugins';
import { StrataPluginConfigError } from '@strata/plugins';
import type { CloudProvider, ProviderOp } from './provider';

export type PlacedOp = {
  readonly provider: CloudProvider;
  readonly op: ProviderOp;
};

/**
 * Aggregates cloud providers and tracks the active one based on
 * `CloudService.active$`. Provides helpers for op placement lookups.
 *
 * Mirrors the `ClientAuthService` → `CloudService` cascade:
 * `CloudService.active$` drives `activeProvider$`.
 */
export class CloudProviderService {
  private readonly byName: ReadonlyMap<string, CloudProvider>;
  private readonly activeProvider$$: BehaviorSubject<CloudProvider | null>;
  private readonly sub: Subscription;

  readonly activeProvider$: Observable<CloudProvider | null>;
  readonly all: readonly CloudProvider[];

  constructor(
    providers: readonly CloudProvider[],
    cloud: CloudService,
  ) {
    const byName = new Map<string, CloudProvider>();
    for (const p of providers) {
      if (byName.has(p.name)) throw new StrataPluginConfigError(`CloudProviderService: duplicate provider name "${p.name}"`);
      byName.set(p.name, p);
    }
    this.byName = byName;
    this.all = [...providers];
    this.activeProvider$$ = new BehaviorSubject<CloudProvider | null>(null);
    this.activeProvider$ = this.activeProvider$$.pipe(distinctUntilChanged());

    this.sub = cloud.active$.subscribe((adapter) => {
      if (adapter) {
        this.activeProvider$$.next(byName.get(adapter.name) ?? null);
      } else {
        this.activeProvider$$.next(null);
      }
    });
  }

  get activeProvider(): CloudProvider | null {
    return this.activeProvider$$.getValue();
  }

  get(name: string): CloudProvider | undefined {
    return this.byName.get(name);
  }

  pageActions(): readonly PlacedOp[] {
    return this.all.flatMap((p) =>
      p.ops.filter((o) => o.placement === 'page-action').map((o) => ({ provider: p, op: o })),
    );
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
