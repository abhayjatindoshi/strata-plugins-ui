import type { StorageAdapter } from 'strata-data-sync';
import type { CloudProvider } from '../tenants/provider';

/** A cloud provider that also acts as a storage adapter. */
export type CloudProviderAdapter = CloudProvider & StorageAdapter;

/**
 * Maps auth provider names to cloud providers. The `StrataProvider` calls
 * `resolve(authName)` on sign-in to pick the right cloud adapter for the
 * active session.
 *
 * ```ts
 * const cloud = new CloudFactory()
 *   .register('google', googleProvider)
 *   .register('onedrive', onedriveProvider);
 * ```
 */
export class CloudFactory {
  private readonly map = new Map<string, CloudProviderAdapter>();

  /** Register a cloud provider under the given auth name. */
  register(authName: string, provider: CloudProviderAdapter): this {
    this.map.set(authName, provider);
    return this;
  }

  /** Resolve the cloud provider for the given auth name. */
  resolve(authName: string): CloudProviderAdapter | undefined {
    return this.map.get(authName);
  }

  /** All registered providers (for `<TenantsPage>`). */
  get providers(): readonly CloudProvider[] {
    return [...this.map.values()];
  }
}
