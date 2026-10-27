import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { saveWorkspace, WorkspaceConflictError } from '@/lib/workspace-cloud';
import { supabase } from '@/lib/supabase';
import { readWorkspaceSnapshot } from '@/lib/workspace-storage';
import { WORKSPACE_DATA_CHANGED } from '@/lib/workspace-sync-events';

export function useLocalDataSync(initialRevision: number | null) {
  const [state, setState] = useState<'idle' | 'offline' | 'syncing' | 'error'>(() => navigator.onLine ? 'idle' : 'offline');
  const [lastSyncAt, setLastSyncAt] = useState<string>();
  const [pendingCount, setPendingCount] = useState(0);
  const revision = useRef(initialRevision);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const syncBlocked = useRef(false);

  useEffect(() => {
    const setOnline = () => {
      setState('idle');
      window.dispatchEvent(new Event(WORKSPACE_DATA_CHANGED));
    };
    const setOffline = () => setState('offline');
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  const sync = useCallback(async (announce = true) => {
    if (!supabase) {
      const error = new Error('Supabase is not configured.');
      setState('error');
      if (announce) toast.error(error.message);
      return false;
    }
    if (!navigator.onLine) {
      setState('offline');
      setPendingCount(1);
      if (announce) toast.error('Offline changes are waiting to sync.');
      return false;
    }
    if (inFlight.current) {
      rerun.current = true;
      return false;
    }

    inFlight.current = true;
    setState('syncing');
    setPendingCount(1);
    try {
      const nextRevision = await saveWorkspace(readWorkspaceSnapshot(), revision.current);
      revision.current = nextRevision;
      setLastSyncAt(new Date().toISOString());
      setPendingCount(0);
      setState('idle');
      if (announce) toast.success('Workspace data synced.');
      return true;
    } catch (error) {
      setState('error');
      setPendingCount(1);
      if (error instanceof WorkspaceConflictError) syncBlocked.current = true;
      const message = error instanceof WorkspaceConflictError
        ? error.message
        : error instanceof Error ? error.message : 'Unable to sync workspace data.';
      toast.error(message);
      return false;
    } finally {
      inFlight.current = false;
      if (rerun.current) {
        rerun.current = false;
        void sync(false);
      }
    }
  }, []);

  useEffect(() => {
    const scheduleSync = () => {
      if (syncBlocked.current) return;
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      setPendingCount(1);
      timer.current = window.setTimeout(() => void sync(false), 500);
    };
    window.addEventListener(WORKSPACE_DATA_CHANGED, scheduleSync);
    return () => {
      window.removeEventListener(WORKSPACE_DATA_CHANGED, scheduleSync);
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, [sync]);

  return { sync, state, lastSyncAt, pendingCount, hasPublishedSnapshot: true };
}
