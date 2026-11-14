/** 한 번의 시도. 운동에선 load=무게, value=횟수지만 이 모듈은 의미를 모른다. */
export interface Attempt { load: number | null; value: number }
export interface Range { min: number; max: number }

const allReachedTop = (attempts: Attempt[], range: Range) =>
  attempts.length > 0 && attempts.every((t) => t.value >= range.max);

/** 모든 시도가 범위 위쪽을 채웠으면 load를 step만큼 올리고 value를 범위 아래쪽으로. */
export function decideProgression(last: Attempt[], range: Range, step: number): { ready: boolean; next: Attempt[] } {
  const ready = allReachedTop(last, range);
  const next = last.map((t) =>
    ready ? { load: t.load === null ? null : t.load + step, value: range.min } : { ...t },
  );
  return { ready, next };
}

const maxLoad = (attempts: Attempt[]) => Math.max(...attempts.map((t) => t.load ?? 0));

/** 최근 3회가 같은 최대 load이고 3회 모두 위쪽을 못 채웠으면 정체. history는 오래된 → 최근. */
export function isStalled(history: Attempt[][], range: Range): boolean {
  if (history.length < 3) return false;
  const recent = history.slice(-3);
  const load = maxLoad(recent[0]);
  return recent.every((h) => h.length > 0 && maxLoad(h) === load && !allReachedTop(h, range));
}
