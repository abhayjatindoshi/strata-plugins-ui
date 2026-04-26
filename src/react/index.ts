// Config builder
export { createStrataConfig } from './create-strata-config';
export type { StrataConfigInput, StrataConfig, TenantLabels } from './create-strata-config';

// Providers
export { StrataProvider } from './strata-provider';
export type { StrataProviderProps } from './strata-provider';
export { TenantProvider } from './tenant-provider';
export type { TenantProviderProps, TenantOps } from './tenant-provider';

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
export { useAuth, useStrata } from './strata-provider';
export type { UseAuthResult, SupportedAuthEntry } from './strata-provider';
export { useTenant } from './tenant-provider';
export type { UseTenantResult } from './tenant-provider';