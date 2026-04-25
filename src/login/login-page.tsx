import type { ClientAuthService, SupportedAuth } from 'strata-adapters';
import { useStrataContext } from '../react/strata-provider';
import { LoginButton } from '../react/components/login-button';

export type LoginButtonsProps = {
  /** Optional — falls back to `<StrataProvider>` context. */
  readonly authService?: ClientAuthService;
  readonly className?: string;
  readonly buttonClassName?: string;
};

/**
 * Renders one branded `<LoginButton>` per `supportedAuths()` entry.
 * Layout is the consumer's responsibility.
 */
export function LoginButtons(props: LoginButtonsProps) {
  const { config } = useStrataContext();
  const authService = props.authService ?? config.auth;
  if (!authService) {
    throw new Error('LoginButtons: no ClientAuthService — pass authService prop or render under <StrataProvider>');
  }
  const supported = authService.supportedAuths();

  if (supported.length === 0) return null;

  return (
    <div className={props.className}>
      {supported.map((auth) => (
        <ProviderSignInButton key={auth.name} auth={auth} className={props.buttonClassName} />
      ))}
    </div>
  );
}

function ProviderSignInButton({
  auth,
  className,
}: {
  readonly auth: SupportedAuth;
  readonly className?: string;
}) {
  const onClick = () => {
    void auth.login();
  };
  if (auth.name === 'google') {
    return (
      <div className={className}>
        <LoginButton provider="google" onClick={onClick} />
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
