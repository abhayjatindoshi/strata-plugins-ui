import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/**
 * Drive-style circular spinner: a single arc rotates around the circle while
 * cycling through Google's four brand colors. Pure SVG + SMIL — no extra CSS.
 *
 * Sized via `font-size` (defaults to `1em`).
 */
export function DriveSpinnerIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="80 200"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke"
          values="#4285f4; #ea4335; #fbbc04; #34a853; #4285f4"
          dur="5.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
