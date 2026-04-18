import { ICON_DEFAULTS, type GoogleIconProps } from './icon-base';

/** Storage box icon used for the appDataFolder space. */
export function AppDataIcon(props: GoogleIconProps) {
  return (
    <svg {...ICON_DEFAULTS} {...props} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-1h-4v-3h-2v3H6v-6h12v6z"
      />
    </svg>
  );
}
