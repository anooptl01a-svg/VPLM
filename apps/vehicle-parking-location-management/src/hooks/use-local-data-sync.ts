import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { loadOfflineState } from '@/lib/offline-store';

export function useLocalDataSync() {
  const [state, setState] = useState<'idle' | 'offline'>(() => navigator.onLine ? 'idle' : 'offline');
  const [lastSyncAt] = useState(() => loadOfflineState()?.savedAt);

  useEffect(() => {
    const setOnline = () => setState('idle');
    const setOffline = () => setState('offline');
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  const sync = useCallback(async (announce = true) => {
    if (announce) toast.info('This app currently saves data only in this browser. Cloud sync is not configured.');
    return true;
  }, []);

  return { sync, state, lastSyncAt, pendingCount: 0, hasPublishedSnapshot: true };
}
