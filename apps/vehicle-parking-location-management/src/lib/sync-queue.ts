export type LocalMutation = { id: string; entity: string; action: string; recordId: string; [key: string]: unknown };

export function enqueueSync(_operation: LocalMutation): void {
  // The main application state is persisted locally; there is no remote service configured.
}
