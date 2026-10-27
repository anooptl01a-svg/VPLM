export type WorkshopBayDefinition = {
  bayNumber: number;
  lane: string;
  direction: 'Forward' | 'Reverse';
};

const workshopLines = [
  { start: 1, end: 19, lane: 'Line 1 · 01–19', direction: 'Forward' },
  { start: 20, end: 37, lane: 'Line 2 · 20–37', direction: 'Forward' },
  { start: 38, end: 56, lane: 'Line 3 · 38–56', direction: 'Reverse' },
  { start: 57, end: 75, lane: 'Line 4 · 57–75', direction: 'Reverse' },
] satisfies Array<{ start: number; end: number; lane: string; direction: WorkshopBayDefinition['direction'] }>;

/**
 * Application-owned Workshop Parking layout.
 * These 75 core bays are always restored during reconciliation; saved state only
 * supplies their live occupancy, reservation, maintenance, and remarks state.
 */
export const workshopBayDefinitions: WorkshopBayDefinition[] = workshopLines.flatMap(
  (line: { start: number; end: number; lane: string; direction: WorkshopBayDefinition['direction'] }) =>
    Array.from({ length: line.end - line.start + 1 }, (_: unknown, index: number) => ({
      bayNumber: line.start + index,
      lane: line.lane,
      direction: line.direction,
    })),
);
