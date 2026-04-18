import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Google Forms file icon — purple page with checklist. */
export function GoogleFormIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="#673ab7"
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
      />
      <path
        fill="#ffffff"
        d="M8 12h1.2v1.2H8zm2 .2h6v.9h-6zM8 14.4h1.2v1.2H8zm2 .2h6v.9h-6zM8 16.8h1.2v1.2H8zm2 .2h6v.9h-6z"
      />
    </svg>
  );
}
