import { describe, expect, it } from 'vitest';
import { selectSnapshotsToDrop } from '../src/services/documents.js';

const DAY = 86_400_000;
const now = new Date('2026-10-25T12:00:00Z');
const at = (daysAgo: number, seq: number) => ({ seq, createdAt: new Date(now.getTime() - daysAgo * DAY) });
const policy = { keepAllDays: 7, dailyDays: 30, weeklyDays: 365 };

describe('history retention', () => {
  it('keeps everything recent and the newest snapshot always', () => {
    expect(selectSnapshotsToDrop([at(0.1, 10), at(1, 9), at(6, 8)], policy, now)).toEqual([]);
    expect(selectSnapshotsToDrop([at(400, 2), at(400.01, 1)], policy, now)).toEqual([1]);
  });

  it('thins older snapshots to one per day, week, month', () => {
    const snaps = [
      at(1, 100),
      at(10, 90),
      at(10.2, 89), // same day as 90 → dropped
      at(11, 88),
      at(40, 70),
      at(41, 69), // likely same week as 70
      at(200, 50),
      at(201, 49),
    ];
    const drop = selectSnapshotsToDrop(snaps, policy, now);
    expect(drop).toContain(89);
    expect(drop).not.toContain(90);
    expect(drop).not.toContain(88);
    expect(drop).not.toContain(100);
    expect(drop.length).toBeGreaterThanOrEqual(2);
  });
});
