import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Google Sheets file icon — green page with grid. */
export function GoogleSheetIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="#0f9d58"
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
      />
      <path
        fill="#ffffff"
        d="M7.5 11.8h9v6.4h-9zM10.5 12.5h-2.3v1.3h2.3zm5.3 0h-4.6v1.3h4.6zm-5.3 2h-2.3v1.3h2.3zm5.3 0h-4.6v1.3h4.6zm-5.3 2h-2.3v1.3h2.3zm5.3 0h-4.6v1.3h4.6z"
      />
    </svg>
  );
}
