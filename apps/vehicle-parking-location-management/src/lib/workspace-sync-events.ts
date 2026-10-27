export const WORKSPACE_DATA_CHANGED = 'vplm:workspace-data-changed';

export function notifyWorkspaceDataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WORKSPACE_DATA_CHANGED));
}
