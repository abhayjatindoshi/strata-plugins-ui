import { type ReactNode } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { TenantProvider } from '../tenant-provider';
import { useTenant } from '../hooks/use-tenant';

export type TenantGuardProps = {
  readonly paramId: string;
  readonly redirect: string;
  readonly loading?: ReactNode;
};

export function TenantGuard({ paramId, redirect, loading = null }: TenantGuardProps) {
  const params = useParams();
  const tenantId = params[paramId];

  // Param missing entirely (route misconfigured or trailing slash) — redirect
  // immediately rather than mounting TenantProvider with `undefined` and
  // ending up in an indefinite loading state.
  if (tenantId === undefined) return <Navigate to={redirect} replace />;

  return (
    <TenantProvider tenantId={tenantId}>
      <TenantGate redirect={redirect} loading={loading} />
    </TenantProvider>
  );
}

function TenantGate({ redirect, loading }: { redirect: string; loading: ReactNode }) {
  const { tenant, loading: tenantLoading, error } = useTenant();

  if (tenantLoading || (!tenant && !error)) return <>{loading}</>;
  if (!tenant) return <Navigate to={redirect} replace />;
  return <Outlet />;
}
