import { useEffect, useState } from 'react';
import type { LoginButtonBaseProps } from '../react/components/login-button';
import GoogleGIcon from './icons/google-g.svg?react';
import './google-login-button.css';

export type GoogleLoginButtonProps = LoginButtonBaseProps;

/** Resolve `theme="auto"` against `prefers-color-scheme`. SSR-safe: defaults to `light`. */
function useResolvedTheme(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>(
    theme === 'auto' ? 'light' : theme,
  );
  useEffect(() => {
    if (theme !== 'auto' || typeof window === 'undefined' || !window.matchMedia) {
      setResolved(theme === 'auto' ? 'light' : theme);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setResolved(mq.matches ? 'dark' : 'light');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [theme]);
  return resolved;
}

export function GoogleLoginButton({
  variant = 'pill',
  theme = 'light',
  className,
  children,
  ...rest
}: GoogleLoginButtonProps) {
  const resolvedTheme = useResolvedTheme(theme);
  const label = typeof children === 'string' ? children : 'Sign in with Google';
  const isIcon = variant === 'icon';

  return (
    <button
      type="button"
      className={['gsi-material-button', className].filter(Boolean).join(' ')}
      data-gsi-variant={variant}
      data-gsi-theme={resolvedTheme}
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
