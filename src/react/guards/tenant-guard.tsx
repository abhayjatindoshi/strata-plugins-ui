import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useTenant } from '../tenant-provider';

export type TenantGuardProps = {
  readonly redirect: string;
  readonly loading?: ReactNode;
};

/**
 * Gates a route on the active tenant from `<TenantProvider>`. Redirects
 * when no tenant is loaded. The app mounts `<TenantProvider>` above this
 * guard and wires the `tenantId` (e.g. from URL params).
 */
export function TenantGuard({ redirect, loading = null }: TenantGuardProps) {
  const { active, loading: tenantLoading, error } = useTenant();

  if (tenantLoading || (!active && !error)) return <>{loading}</>;
  if (!active) return <Navigate to={redirect} replace />;
  return <Outlet />;
}
