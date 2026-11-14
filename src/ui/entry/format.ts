import type { Exercise, WorkoutSet } from '../../types';
import { formatCount, measureOf } from '../../workout/measure';

const fmtNum = (n: number) => String(Math.round(n * 100) / 100);

export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}'${String(total % 60).padStart(2, '0')}"/km`;
}

/** 지난번 기록 한 줄 요약 (워밍업 제외) */
export function summarizeSets(ex: Exercise, sets: WorkoutSet[]): string {
  const work = sets.filter((s) => !s.isWarmup);
  if (work.length === 0) return '';
  if (ex.type === 'cardio') {
    const s = work[0];
    return [s.durationSec ? `${fmtNum(s.durationSec / 60)}분` : '', s.distanceKm ? `${fmtNum(s.distanceKm)}km` : ''].filter(Boolean).join(' ');
  }
  if (ex.type === 'bodyweight') {
    const body = work.map((s) => `${formatCount(s)}${s.addedWeightKg ? `(+${fmtNum(s.addedWeightKg)})` : ''}`).join(',');
    return measureOf(ex) === 'seconds' ? body : `${body}회`;
  }
  const weights = new Set(work.map((s) => s.weightKg));
  if (weights.size === 1) return `${fmtNum(work[0].weightKg ?? 0)}kg × ${work.map(formatCount).join(',')}`;
  return work.map((s) => `${fmtNum(s.weightKg ?? 0)}×${formatCount(s)}`).join(', ');
}

export { fmtNum };
