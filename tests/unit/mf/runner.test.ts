import { describe, expect, it } from 'vitest';
import { getCurrentAndPreviousMonthRange } from '@/lib/mf/sync/range';

describe('getCurrentAndPreviousMonthRange', () => {
  it('returns previous month first day through current day', () => {
    const range = getCurrentAndPreviousMonthRange(new Date('2026-04-30T12:00:00.000Z'));

    expect(range).toEqual({
      from: '2026-03-01',
      to: '2026-04-30',
    });
  });
});
