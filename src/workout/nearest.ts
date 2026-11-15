import type { Entry, ISODate } from '../types';
import { compareISO } from '../lib/date';

/**
 * 그 날짜 이전의 가장 최근 기록을 찾고, 없으면 가장 가까운 이후 기록을 찾는다.
 * (지난 날짜를 나중에 채울 때 앞선 기록이 없을 수 있어서)
 * `entries`는 호출부에서 디로드·삭제를 걸러서 넘긴다.
 */
export function nearestEntry(entries: Entry[], date: ISODate, has: (e: Entry) => boolean): { entry: Entry; after: boolean } | undefined {
  let before: Entry | undefined;
  let after: Entry | undefined;
  for (const e of entries) {
    if (!has(e)) continue;
    const c = compareISO(e.date, date);
    if (c < 0 && (!before || compareISO(e.date, before.date) > 0)) before = e;
    if (c > 0 && (!after || compareISO(e.date, after.date) < 0)) after = e;
  }
  if (before) return { entry: before, after: false };
  return after ? { entry: after, after: true } : undefined;
}
