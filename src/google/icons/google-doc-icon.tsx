import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Google Docs file icon — blue page with lines. */
export function GoogleDocIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="#4285f4"
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
      />
      <path
        fill="#ffffff"
        d="M7.5 12h9v1.2h-9zM7.5 14.4h9v1.2h-9zM7.5 16.8h6v1.2h-6z"
      />
    </svg>
  );
}
