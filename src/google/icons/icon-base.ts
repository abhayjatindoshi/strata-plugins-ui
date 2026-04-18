import type { SVGProps } from 'react';

/** Base props every icon accepts. Defaults `width/height` to `1em` so sizing is
 * controlled by the parent's `font-size`, matching Material Symbols behavior. */
export type GoogleIconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox'>;

export const ICON_DEFAULTS = {
  width: '1em',
  height: '1em',
  focusable: false,
  'aria-hidden': true,
} as const;
