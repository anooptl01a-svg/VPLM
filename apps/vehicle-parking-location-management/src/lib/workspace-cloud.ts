import { supabase } from '@/lib/supabase';
import type { WorkspaceSnapshot } from '@/lib/workspace-storage';

export class WorkspaceConflictError extends Error {
  constructor() {
    super('Workspace data changed in another session. Reload the page before making more changes.');
    this.name = 'WorkspaceConflictError';
  }
}

export async function loadWorkspace(userId: string): Promise<{ snapshot: WorkspaceSnapshot | null; revision: number | null }> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error('Your account is not a member of this workspace. Ask the workspace administrator to grant access.');

  const { data, error } = await supabase
    .from('workspace_state')
    .select('state, revision')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;

  if (data?.state) {
    if (typeof data.state !== 'object' || Array.isArray(data.state)) {
      throw new Error('The saved workspace data has an invalid format.');
    }
    for (const [key, value] of Object.entries(data.state)) {
      if (typeof value !== 'string' && value !== null) {
        throw new Error(`The saved workspace data contains an invalid value for ${key}.`);
      }
    }
  }

  return {
    snapshot: data?.state as WorkspaceSnapshot | null ?? null,
    revision: data?.revision ?? null,
  };
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot, revision: number | null): Promise<number> {
  if (!supabase) throw new Error('Supabase is not configured.');

  if (revision === null) {
    const { data, error } = await supabase
      .from('workspace_state')
      .insert({ id: 1, state: snapshot, revision: 1 })
      .select('revision')
      .single();
    if (error?.code === '23505') throw new WorkspaceConflictError();
    if (error) throw error;
    return data.revision;
  }

  const { data, error } = await supabase
    .from('workspace_state')
    .update({ state: snapshot, revision: revision + 1, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .eq('revision', revision)
    .select('revision')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new WorkspaceConflictError();
  return data.revision;
}
