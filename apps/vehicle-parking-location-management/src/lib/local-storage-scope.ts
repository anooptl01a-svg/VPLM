export const appStorageKey = (key: string): string => {
  const isLocalGuest = new URLSearchParams(window.location.search).get('guest') === '1';
  return isLocalGuest ? `vplm-local-guest:${key}` : key;
};
