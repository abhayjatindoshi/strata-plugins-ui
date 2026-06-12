// Config builder
export { createFyreDbConfig } from './create-fyredb-config';
export type { FyreDbConfigInput, FyreDbConfig, TenantLabels } from './create-fyredb-config';

// Providers
export { FyreDbProvider } from './fyredb-provider';
export type { FyreDbProviderProps } from './fyredb-provider';
export { TenantProvider } from './tenant-provider';
export type { TenantProviderProps, TenantOps, TenantStatus } from './tenant-provider';

// Guards
export { AuthGuard } from './guards/auth-guard';
export type { AuthGuardProps } from './guards/auth-guard';
export { TenantGuard } from './guards/tenant-guard';
export type { TenantGuardProps } from './guards/tenant-guard';

// Components
export { LoginButton } from './components/login-button';
export type {
  LoginButtonProps,
  LoginButtonBaseProps,
  LoginButtonTheme,
  LoginButtonVariant,
} from './components/login-button';

// Hooks
export { useAuth, useFyreDb } from './fyredb-provider';
export type { UseAuthResult, SupportedAuthEntry } from './fyredb-provider';
export { useTenant } from './tenant-provider';
export type { UseTenantResult } from './tenant-provider';