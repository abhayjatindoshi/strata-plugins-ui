import type { LoginButtonBaseProps } from '../react/components/login-button';
import GoogleGIcon from './icons/google-g.svg?react';
import gsiCss from './google-login-button.css?inline';

const STYLE_TAG_ATTR = 'data-strata-gsi-button';

/** Inject the GSI stylesheet once per document at module load — before first paint,
 * so the SVG never flashes unstyled. */
function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector(`style[${STYLE_TAG_ATTR}]`)) return;
  const style = document.createElement('style');
  style.setAttribute(STYLE_TAG_ATTR, '');
  style.textContent = gsiCss;
  document.head.appendChild(style);
}

ensureStyles();

/**
 * Google brand-conformant sign-in button. Renders the exact markup + styles
 * from Google's GSI branding guidelines (hover / focus / active state layers,
 * multi-color G logo). Four variants: pill/icon × light/dark.
 *
 * Pure UI — wire up `onClick` yourself (typically `() => login('google')`).
 *
 * ```tsx
 * <GoogleLoginButton onClick={() => login('google')} />
 * <GoogleLoginButton theme="dark" variant="icon" onClick={handler} />
 * ```
 */
export type GoogleLoginButtonProps = LoginButtonBaseProps;

export function GoogleLoginButton({
  variant = 'pill',
  theme = 'light',
  className,
  children,
  ...rest
}: GoogleLoginButtonProps) {
  const label = typeof children === 'string' ? children : 'Sign in with Google';
  const isIcon = variant === 'icon';

  return (
    <button
      type="button"
      className={['gsi-material-button', className].filter(Boolean).join(' ')}
      data-gsi-variant={variant}
      data-gsi-theme={theme}
      aria-label={isIcon ? label : undefined}
      {...rest}
    >
      <div className="gsi-material-button-state" />
      <div className="gsi-material-button-content-wrapper">
        <div className="gsi-material-button-icon">
          <GoogleGIcon
            width="100%"
            height="100%"
            style={{ display: 'block' }}
          />
        </div>
        {!isIcon && <span className="gsi-material-button-contents">{label}</span>}
      </div>
    </button>
  );
}
