/** 한 번의 시도. 운동에선 load=무게, value=횟수지만 이 모듈은 의미를 모른다. */
export interface Attempt { load: number | null; value: number }
export interface Range { min: number; max: number }

const allReachedTop = (attempts: Attempt[], range: Range) =>
  attempts.length > 0 && attempts.every((t) => t.value >= range.max);

/**
 * 올릴 차례 판단.
 * - load가 모두 같으면: 모든 시도가 범위 위쪽을 채웠을 때만 전부 올린다.
 * - load가 서로 다르면(피라미드 등): 시도마다 따로 판단해 채운 것만 올린다.
 * 올린 시도는 load + step, value는 범위 아래쪽. ready는 하나라도 올렸는지.
 */
export function decideProgression(last: Attempt[], range: Range, step: number): { ready: boolean; next: Attempt[] } {
  const perAttempt = new Set(last.map((t) => t.load)).size > 1;
  const advance = (t: Attempt) => ({ load: t.load === null ? null : t.load + step, value: range.min });
  if (perAttempt) {
    const next = last.map((t) => (t.value >= range.max ? advance(t) : { ...t }));
    return { ready: last.some((t) => t.value >= range.max), next };
  }
  const ready = allReachedTop(last, range);
  return { ready, next: last.map((t) => (ready ? advance(t) : { ...t })) };
}

const maxLoad = (attempts: Attempt[]) => Math.max(...attempts.map((t) => t.load ?? 0));

/** 최근 3회가 같은 최대 load이고 3회 모두 위쪽을 못 채웠으면 정체. history는 오래된 → 최근. */
export function isStalled(history: Attempt[][], range: Range): boolean {
  if (history.length < 3) return false;
  const recent = history.slice(-3);
  const load = maxLoad(recent[0]);
  return recent.every((h) => h.length > 0 && maxLoad(h) === load && !allReachedTop(h, range));
}
