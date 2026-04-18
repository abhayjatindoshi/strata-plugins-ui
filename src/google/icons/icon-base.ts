import type { FunctionComponent, SVGProps } from 'react';

/** Type alias for icon components — every icon accepts standard SVG props.
 * Defaults `width/height/focusable/aria-hidden` are baked into each .svg via
 * `vite-plugin-svgr`'s `svgProps` option, so consumers can size them via
 * `font-size` (default 1em) or override directly. */
export type GoogleIconProps = SVGProps<SVGSVGElement>;

/** Type alias for an icon component. */
export type GoogleIconComponent = FunctionComponent<GoogleIconProps>;
