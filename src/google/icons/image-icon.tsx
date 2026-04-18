import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Image file icon — generic picture glyph. */
export function ImageIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="#ea4335"
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
      />
      <path
        fill="#ffffff"
        d="m8 18 2.4-3 1.6 2 2.4-3 2 4H8zm2-5.2a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0z"
      />
    </svg>
  );
}
