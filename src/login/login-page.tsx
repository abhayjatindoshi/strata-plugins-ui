import { useEffect } from 'react';
import type { ClientAuthService, SupportedAuth } from 'strata-adapters';
import { useStrataContext } from '../react/strata-provider';
import { LoginButton } from '../react/components/login-button';

export type LoginPageClassNames = {
  readonly root?: string;
  readonly header?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly buttons?: string;
  readonly buttonWrap?: string;
  readonly footer?: string;
  readonly empty?: string;
};

export type LoginPageLabels = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly empty?: string;
};

export type LoginPageProps = {
  /** Optional — falls back to `<StrataProvider>` context. */
  readonly authService?: ClientAuthService;
  readonly classNames?: LoginPageClassNames;
  readonly labels?: LoginPageLabels;
  /** Fired when the auth service transitions to `signed-in`. */
  readonly onAuthenticated?: (name: string) => void;
};

const DEFAULT_LABELS: Required<LoginPageLabels> = {
  title: 'Sign in',
  subtitle: 'Choose a provider to continue.',
  empty: 'No sign-in providers configured.',
};

/**
 * Skeleton login page. Reads `authService.supportedAuths()` and renders one
 * branded `<LoginButton>` per entry. Logic is fixed; skinning via
 * `classNames` / `labels`.
 *
 * Per PLUGGABLES_V2 §20.
 */
export function LoginPage(props: LoginPageProps) {
  const cn = props.classNames ?? {};
  const labels = { ...DEFAULT_LABELS, ...props.labels };
  const { config, authState } = useStrataContext();
  const authService = props.authService ?? config.auth;
  if (!authService) {
    throw new Error('LoginPage: no ClientAuthService — pass authService prop or render under <StrataProvider>');
  }
  const supported = authService.supportedAuths();
  const state = authState;

  useEffect(() => {
    if (state.status === 'signed-in' && state.name) {
      props.onAuthenticated?.(state.name);
    }
  }, [state, props]);

  return (
    <div className={cn.root}>
      <header className={cn.header}>
        <h1 className={cn.title}>{labels.title}</h1>
        <p className={cn.subtitle}>{labels.subtitle}</p>
      </header>

      {supported.length === 0 ? (
        <p className={cn.empty}>{labels.empty}</p>
      ) : (
        <div className={cn.buttons}>
          {supported.map((auth) => (
            <ProviderSignInButton key={auth.name} auth={auth} wrapClassName={cn.buttonWrap} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderSignInButton({
  auth,
  wrapClassName,
}: {
  readonly auth: SupportedAuth;
  readonly wrapClassName?: string;
}) {
  const onClick = () => {
    void auth.login();
  };
  if (auth.name === 'google') {
    return (
      <div className={wrapClassName}>
        <LoginButton provider="google" onClick={onClick} />
      </div>
    );
  }
  return (
    <div className={wrapClassName}>
      <button type="button" onClick={onClick}>
        Sign in with {auth.name}
      </button>
    </div>
  );
}
