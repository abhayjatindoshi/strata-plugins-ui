import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Generic file page icon — gray, matches Drive's "unknown file" glyph. */
export function GenericFileIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="#5f6368"
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
      />
    </svg>
  );
}
