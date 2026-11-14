import { addDays, compareISO } from '../lib/date';
import type { ISODate } from '../types';

/** 순환 목록의 한 칸. 목록 순서대로 전달한다. */
export interface RotationItem { id: string; isRest: boolean }
export interface RotationLog { date: ISODate; itemId: string }
export interface RotationStep { date: ISODate; itemId: string; pos: number; inferred: boolean }
export interface Walk { steps: RotationStep[]; nextItemId: string | null; nextPos: number }

/**
 * `until`보다 앞선 기록으로 순환을 따라간다.
 * - pos: 목록에서 앞으로 나아간 칸 수(첫 기록 0). 목록 길이만큼 나아가면 한 바퀴.
 * - 기록 없는 날에 휴식 차례면 휴식으로 간주(inferred)하고 한 칸 나아간다. 운동 차례면 머문다.
 */
export function walkRotation(items: RotationItem[], logs: RotationLog[], until: ISODate): Walk {
  const n = items.length;
  if (n === 0) return { steps: [], nextItemId: null, nextPos: 0 };
  const indexOf = new Map(items.map((it, i) => [it.id, i]));
  const usable = logs
    .filter((l) => compareISO(l.date, until) < 0 && indexOf.has(l.itemId))
    .sort((a, b) => compareISO(a.date, b.date));
  if (usable.length === 0) return { steps: [], nextItemId: items[0].id, nextPos: 0 };

  const steps: RotationStep[] = [];
  let lastIdx = -1;
  let lastPos = -1;

  const inferGap = (from: ISODate, to: ISODate) => {
    for (let d = addDays(from, 1); compareISO(d, to) < 0; d = addDays(d, 1)) {
      const next = (lastIdx + 1) % n;
      if (!items[next].isRest) return;
      lastIdx = next;
      lastPos += 1;
      steps.push({ date: d, itemId: items[next].id, pos: lastPos, inferred: true });
    }
  };

  usable.forEach((l, i) => {
    const idx = indexOf.get(l.itemId)!;
    if (i === 0) {
      lastPos = 0;
    } else {
      inferGap(usable[i - 1].date, l.date);
      lastPos += (idx - lastIdx + n) % n;
    }
    lastIdx = idx;
    steps.push({ date: l.date, itemId: l.itemId, pos: lastPos, inferred: false });
  });
  inferGap(usable[usable.length - 1].date, until);

  return { steps, nextItemId: items[(lastIdx + 1) % n].id, nextPos: lastPos + 1 };
}
