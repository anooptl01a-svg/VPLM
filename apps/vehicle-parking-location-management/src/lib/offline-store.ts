import type { Movement, ParkingLocation, Reservation, Vehicle } from '@/lib/parking-data';
import { notifyWorkspaceDataChanged } from '@/lib/workspace-sync-events';

const STORAGE_KEY = 'vehicle-parking-browser-state-v2';
const MAX_LOCAL_HISTORY_ITEMS = 500;

export type OfflineAuditEvent = {
  id: string;
  action: string;
  entity: string;
  detail: string;
  actor: string;
  timestamp: string;
  recordId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  snapshot?: string;
  archived?: boolean;
};

export type OfflineState = {
  vehicles: Vehicle[];
  locations: ParkingLocation[];
  movements: Movement[];
  reservations: Reservation[];
  auditEvents: OfflineAuditEvent[];
  pendingChanges: number;
  savedAt: string;
};

export const loadOfflineState = (): OfflineState | undefined => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as OfflineState) : undefined;
  } catch {
    return undefined;
  }
};

const isPersistentUrl = (value: string): boolean => !value.startsWith('data:') && !value.startsWith('blob:');

const createQuotaSafeState = (state: OfflineState): OfflineState => ({
  ...state,
  vehicles: state.vehicles.map((vehicle: Vehicle) => ({
    ...vehicle,
    photoUrls: vehicle.photoUrls.filter(isPersistentUrl),
  })),
  movements: state.movements.slice(0, MAX_LOCAL_HISTORY_ITEMS),
  auditEvents: state.auditEvents.slice(0, MAX_LOCAL_HISTORY_ITEMS),
});

export const saveOfflineState = (state: OfflineState): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const savedState = createQuotaSafeState(state);
    const previousValue = window.localStorage.getItem(STORAGE_KEY);
    let domainDataChanged = previousValue === null;
    if (previousValue !== null) {
      try {
        const previous = JSON.parse(previousValue) as OfflineState;
        domainDataChanged = ['vehicles', 'locations', 'movements', 'reservations', 'auditEvents']
          .some((key) => JSON.stringify(previous[key as keyof OfflineState]) !== JSON.stringify(savedState[key as keyof OfflineState]));
      } catch {
        domainDataChanged = true;
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    if (domainDataChanged) notifyWorkspaceDataChanged();
    return true;
  } catch (error: unknown) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
      try {
        const minimalState: OfflineState = {
          ...createQuotaSafeState(state),
          movements: state.movements.slice(0, 100),
          auditEvents: state.auditEvents.slice(0, 100),
        };
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
        notifyWorkspaceDataChanged();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};
