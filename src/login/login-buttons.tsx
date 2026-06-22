import type { ClientAuthService, SupportedAuth } from '@fyre-db/plugins';
import { FyreDbPluginConfigError } from '@fyre-db/plugins';
import { useFyreDbApp } from '../react/fyredb-app-provider';
import { LoginButton, type LoginButtonTheme, type LoginButtonVariant } from '../react/components/login-button';

export type LoginButtonsProps = {
  /** Optional — falls back to `<FyreDbAppProvider>` context. */
  readonly authService?: ClientAuthService;
  /** Color mode — passed to each branded login button. */
  readonly mode?: LoginButtonTheme;
  /** Visual variant — passed to each branded login button. */
  readonly variant?: LoginButtonVariant;
  readonly className?: string;
  readonly buttonClassName?: string;
};

/**
 * Renders one branded `<LoginButton>` per `supportedAuths()` entry.
 * Layout is the consumer's responsibility.
 */
export function LoginButtons(props: LoginButtonsProps) {
  const app = useFyreDbApp();
  const authService = props.authService ?? app.auth;
  if (!authService) {
    throw new FyreDbPluginConfigError('LoginButtons: no ClientAuthService — pass authService prop or render under <FyreDbAppProvider>');
  }
  const supported = authService.supportedAuths();

  if (supported.length === 0) return null;

  return (
    <div className={props.className}>
      {supported.map((auth) => (
        <ProviderSignInButton key={auth.name} auth={auth} mode={props.mode} variant={props.variant} className={props.buttonClassName} />
      ))}
    </div>
  );
}

function ProviderSignInButton({
  auth,
  mode,
  variant,
  className,
}: {
  readonly auth: SupportedAuth;
  readonly mode?: LoginButtonTheme;
  readonly variant?: LoginButtonVariant;
  readonly className?: string;
}) {
  const onClick = () => {
    void auth.login();
  };
  if (auth.name === 'google') {
    return (
      <div className={className}>
        <LoginButton provider="google" theme={mode} variant={variant} onClick={onClick} />
      </div>
    );
  }
  if (auth.name === 'microsoft') {
    return (
      <div className={className}>
        <LoginButton provider="microsoft" theme={mode} variant={variant} onClick={onClick} />
      </div>
    );
  }
  return (
    <div className={className}>
      <button type="button" onClick={onClick}>
        Sign in with {auth.name}
      </button>
    </div>
  );
}
