/**
 * All styles for `<GoogleDriveExplorer>`. Shipped as a string because
 * `strata-adapters` is built with `tsc` only (no CSS bundler) — we inject
 * this via a `<style>` tag at runtime the first time the explorer mounts.
 *
 * Class names are prefixed with `strata-gdrive-` to avoid collisions. The
 * component supports a `theme` prop that toggles `data-theme="light"` or
 * `data-theme="dark"`; when unset, `prefers-color-scheme` drives it.
 */
export const GOOGLE_DRIVE_EXPLORER_CSS = `
.strata-gdrive-overlay {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 36, 0.6);
  z-index: 1000;
  animation: strata-gdrive-fade-in 120ms ease-out;
}

.strata-gdrive-content {
  --gdrive-surface: #ffffff;
  --gdrive-surface-2: #f8fafd;
  --gdrive-hover: #f1f3f4;
  --gdrive-selected: #c2e7ff;
  --gdrive-selected-text: #041e49;
  --gdrive-text: #1f1f1f;
  --gdrive-text-muted: #444746;
  --gdrive-text-dim: #5f6368;
  --gdrive-divider: #e0e3e7;
  --gdrive-accent: #0b57d0;
  --gdrive-search-bg: #edf1f8;

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(960px, calc(100vw - 32px));
  height: min(640px, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  background: var(--gdrive-surface);
  color: var(--gdrive-text);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  font-family: "Google Sans Text", "Google Sans", Roboto, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  z-index: 1001;
  animation: strata-gdrive-scale-in 140ms ease-out;
}

@media (prefers-color-scheme: dark) {
  .strata-gdrive-content:not(.strata-gdrive-theme-light) {
    --gdrive-surface: #1b1b1b;
    --gdrive-surface-2: #1b1b1b;
    --gdrive-hover: #2f3235;
    --gdrive-selected: #004a77;
    --gdrive-selected-text: #c2e7ff;
    --gdrive-text: #e3e3e3;
    --gdrive-text-muted: #c7c7c7;
    --gdrive-text-dim: #9aa0a6;
    --gdrive-divider: #3c4043;
    --gdrive-accent: #8ab4f8;
    --gdrive-search-bg: #37393b;
  }
}

.strata-gdrive-content.strata-gdrive-theme-dark {
  --gdrive-surface: #1b1b1b;
  --gdrive-surface-2: #1b1b1b;
  --gdrive-hover: #2f3235;
  --gdrive-selected: #004a77;
  --gdrive-selected-text: #c2e7ff;
  --gdrive-text: #e3e3e3;
  --gdrive-text-muted: #c7c7c7;
  --gdrive-text-dim: #9aa0a6;
  --gdrive-divider: #3c4043;
  --gdrive-accent: #8ab4f8;
  --gdrive-search-bg: #37393b;
}

/* ---------- header ---------- */

.strata-gdrive-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gdrive-divider);
  flex-shrink: 0;
}

.strata-gdrive-header-title {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.strata-gdrive-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--gdrive-text);
  margin: 0;
}

.strata-gdrive-description {
  display: none;
}

.strata-gdrive-search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 44px;
  border-radius: 22px;
  background: var(--gdrive-search-bg);
  color: var(--gdrive-text-muted);
  font-size: 20px;
}

.strata-gdrive-search {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  color: var(--gdrive-text);
  font: inherit;
  font-size: 14px;
}

.strata-gdrive-search::placeholder {
  color: var(--gdrive-text-dim);
}

.strata-gdrive-close {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--gdrive-text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.strata-gdrive-close:hover {
  background: var(--gdrive-hover);
}

/* ---------- body ---------- */

.strata-gdrive-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.strata-gdrive-sidebar {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--gdrive-divider);
}

.strata-gdrive-sidebar-item {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--gdrive-divider);
  background: transparent;
  color: var(--gdrive-text);
  font: inherit;
  font-weight: 500;
  text-align: left;
  border-radius: 18px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.strata-gdrive-sidebar-item:hover:not(:disabled) {
  background: var(--gdrive-hover);
}

.strata-gdrive-sidebar-item[data-active] {
  background: var(--gdrive-selected);
  color: var(--gdrive-selected-text);
  border-color: transparent;
}

.strata-gdrive-sidebar-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- main column ---------- */

.strata-gdrive-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.strata-gdrive-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
}

.strata-gdrive-back {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--gdrive-text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.strata-gdrive-back:hover {
  background: var(--gdrive-hover);
}

.strata-gdrive-breadcrumb {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gdrive-text);
  min-width: 0;
  overflow: hidden;
}

.strata-gdrive-breadcrumb-item {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.strata-gdrive-breadcrumb-item:hover {
  background: var(--gdrive-hover);
}

.strata-gdrive-breadcrumb-sep {
  color: var(--gdrive-text-dim);
  font-size: 14px;
  padding: 0 2px;
}

.strata-gdrive-refresh {
  flex-shrink: 0;
  margin-left: auto;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--gdrive-text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.strata-gdrive-refresh:hover {
  background: var(--gdrive-hover);
}

.strata-gdrive-refresh[data-loading] {
  animation: strata-gdrive-spin 1s linear infinite;
}

/* ---------- list / rows ---------- */

.strata-gdrive-col-header {
  display: grid;
  grid-template-columns: 1fr 200px 140px;
  gap: 16px;
  padding: 8px 24px;
  border-bottom: 1px solid var(--gdrive-divider);
  color: var(--gdrive-text-dim);
  font-size: 12px;
  font-weight: 500;
}

.strata-gdrive-list {
  flex: 1;
  position: relative;
  overflow-y: auto;
  padding: 4px 0 12px;
}

.strata-gdrive-row {
  display: grid;
  grid-template-columns: 1fr 200px 140px;
  gap: 16px;
  align-items: center;
  width: 100%;
  padding: 0 24px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--gdrive-text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.strata-gdrive-row:hover:not(:disabled) {
  background: var(--gdrive-hover);
}

.strata-gdrive-row[data-selected] {
  background: var(--gdrive-selected);
  color: var(--gdrive-selected-text);
}

.strata-gdrive-row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.strata-gdrive-row-name {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

.strata-gdrive-row-name > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strata-gdrive-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 20px;
  flex-shrink: 0;
}

.strata-gdrive-row-date,
.strata-gdrive-row-size {
  color: var(--gdrive-text-muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strata-gdrive-row[data-selected] .strata-gdrive-row-date,
.strata-gdrive-row[data-selected] .strata-gdrive-row-size {
  color: var(--gdrive-selected-text);
}

.strata-gdrive-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--gdrive-text-dim);
}

.strata-gdrive-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--gdrive-surface) 60%, transparent);
  color: var(--gdrive-accent);
  font-size: 48px;
  pointer-events: none;
  z-index: 1;
}

.strata-gdrive-loading > span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---------- footer ---------- */

.strata-gdrive-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--gdrive-divider);
  background: var(--gdrive-surface);
  flex-shrink: 0;
}

.strata-gdrive-new-folder {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 40px;
  border: 1px solid var(--gdrive-divider);
  background: transparent;
  color: var(--gdrive-accent);
  font: inherit;
  font-weight: 500;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.strata-gdrive-new-folder:hover:not(:disabled) {
  background: var(--gdrive-hover);
}

.strata-gdrive-new-folder:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.strata-gdrive-new-folder-popover {
  --gdrive-surface: #ffffff;
  --gdrive-text: #1f1f1f;
  --gdrive-divider: #e0e3e7;
  --gdrive-accent: #0b57d0;

  background: var(--gdrive-surface);
  color: var(--gdrive-text);
  border: 1px solid var(--gdrive-divider);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 8px;
  z-index: 1002;
}

@media (prefers-color-scheme: dark) {
  .strata-gdrive-new-folder-popover {
    --gdrive-surface: #2d2e30;
    --gdrive-text: #e3e3e3;
    --gdrive-divider: #3c4043;
    --gdrive-accent: #8ab4f8;
  }
}

.strata-gdrive-new-folder-input {
  border: 1px solid var(--gdrive-divider);
  border-radius: 4px;
  padding: 8px 12px;
  font: inherit;
  font-size: 14px;
  background: var(--gdrive-surface);
  color: var(--gdrive-text);
  outline: none;
}

.strata-gdrive-new-folder-input:focus {
  border-color: var(--gdrive-accent);
}

.strata-gdrive-new-folder-create {
  border: 0;
  background: var(--gdrive-accent);
  color: white;
  border-radius: 4px;
  padding: 0 16px;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.strata-gdrive-new-folder-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.strata-gdrive-cancel,
.strata-gdrive-select {
  padding: 0 24px;
  height: 40px;
  border: 0;
  border-radius: 20px;
  font: inherit;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
}

.strata-gdrive-cancel {
  background: transparent;
  color: var(--gdrive-accent);
}

.strata-gdrive-cancel:hover {
  background: var(--gdrive-hover);
}

.strata-gdrive-select {
  background: var(--gdrive-accent);
  color: var(--gdrive-surface);
}

.strata-gdrive-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- animations ---------- */

@keyframes strata-gdrive-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes strata-gdrive-scale-in {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes strata-gdrive-spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
`;
