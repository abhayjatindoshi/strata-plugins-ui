import { useEffect, useState } from 'react';
import type { LoginButtonBaseProps } from '../react/components/login-button';
import MicrosoftLogo from './icons/microsoft-logo.svg?react';
import './microsoft-login-button.css';

export type MicrosoftLoginButtonProps = LoginButtonBaseProps;

function useResolvedTheme(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => { setResolved(mq.matches ? 'dark' : 'light'); };
    update();
    mq.addEventListener('change', update);
    return () => { mq.removeEventListener('change', update); };
  }, [theme]);
  return theme === 'auto' ? resolved : theme;
}

export function MicrosoftLoginButton({
  variant = 'pill',
  theme = 'light',
  className,
  children,
  ...rest
}: MicrosoftLoginButtonProps) {
  const resolvedTheme = useResolvedTheme(theme);
  const label = typeof children === 'string' ? children : 'Sign in with Microsoft';
  const isIcon = variant === 'icon';

  return (
    <button
      type="button"
      className={['ms-login-button', className].filter(Boolean).join(' ')}
      data-ms-variant={variant}
      data-ms-theme={resolvedTheme}
      aria-label={isIcon ? label : undefined}
      {...rest}
    >
      <div className="ms-login-button-state" />
      <div className="ms-login-button-content-wrapper">
        <div className="ms-login-button-icon">
          <MicrosoftLogo
            width="100%"
            height="100%"
            style={{ display: 'block' }}
          />
        </div>
        {!isIcon && <span className="ms-login-button-contents">{label}</span>}
      </div>
    </button>
  );
}
