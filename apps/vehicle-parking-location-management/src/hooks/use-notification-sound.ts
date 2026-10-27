import { useCallback, useEffect, useMemo, useState } from 'react';

type NotificationSound = 'assignment' | 'success' | 'urgent' | 'general';

const preferenceEvent = 'vplm-notification-sound-preference';

const preferenceKey = (userId: string | undefined): string => `vplm-notification-sound:${userId || 'anonymous'}`;

const readPreference = (userId: string | undefined): boolean => window.localStorage.getItem(preferenceKey(userId)) !== 'off';

const frequencies: Record<NotificationSound, number[]> = {
  assignment: [660, 880],
  success: [523, 659, 784],
  urgent: [880, 660, 880],
  general: [587],
};

export const useNotificationSound = (userId: string | undefined) => {
  const storageKey = useMemo(() => preferenceKey(userId), [userId]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => readPreference(userId));

  useEffect(() => {
    setSoundEnabled(readPreference(userId));
  }, [storageKey, userId]);

  useEffect(() => {
    const handlePreference = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; enabled: boolean }>).detail;
      if (detail?.key === storageKey) setSoundEnabled(detail.enabled);
    };
    window.addEventListener(preferenceEvent, handlePreference);
    return () => window.removeEventListener(preferenceEvent, handlePreference);
  }, [storageKey]);

  const setEnabled = useCallback((enabled: boolean) => {
    window.localStorage.setItem(storageKey, enabled ? 'on' : 'off');
    setSoundEnabled(enabled);
    window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: { key: storageKey, enabled } }));
  }, [storageKey]);

  const toggleSound = useCallback(() => {
    const enabled = !readPreference(userId);
    setEnabled(enabled);
    return enabled;
  }, [setEnabled, userId]);

  const playSound = useCallback((kind: NotificationSound = 'general') => {
    if (!readPreference(userId)) return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const start = context.currentTime;
    frequencies[kind].forEach((frequency: number, index: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.12;
      oscillator.type = kind === 'urgent' ? 'square' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.11);
    });
    window.setTimeout(() => void context.close(), frequencies[kind].length * 120 + 150);
  }, [userId]);

  return { soundEnabled, toggleSound, playSound };
};
