import type { ISODate } from '../types';
import type { Walk } from './rotation';

export interface DeloadState { active: boolean; due: boolean; lapsSinceDeload: number }

/**
 * 디로드 상태를 순환 기록에서 계산한다.
 * - active: 마지막 실제 기록이 디로드이고, 그 디로드 구간 시작에서 아직 한 바퀴를 못 채움
 * - lapsSinceDeload: 마지막 디로드 기록 다음 칸부터(없으면 처음부터) 나아간 바퀴 수
 * - due: 진행 중이 아니고 lapsSinceDeload ≥ everyLaps
 */
export function deloadState(
  walk: Walk,
  deloadDates: ReadonlySet<ISODate>,
  listLength: number,
  everyLaps: number,
): DeloadState {
  const real = walk.steps.filter((s) => !s.inferred);
  if (real.length === 0 || listLength <= 0) return { active: false, due: false, lapsSinceDeload: 0 };

  let lastIdx = -1;
  for (let i = real.length - 1; i >= 0; i--) {
    if (deloadDates.has(real[i].date)) { lastIdx = i; break; }
  }

  let active = false;
  let lapsSinceDeload: number;
  if (lastIdx === -1) {
    lapsSinceDeload = Math.floor(walk.nextPos / listLength);
  } else {
    let startIdx = lastIdx;
    while (startIdx > 0 && deloadDates.has(real[startIdx - 1].date)) startIdx--;
    const startPos = real[startIdx].pos;
    const lastPos = real[lastIdx].pos;
    active = lastIdx === real.length - 1 && walk.nextPos - startPos < listLength;
    lapsSinceDeload = Math.floor((walk.nextPos - (lastPos + 1)) / listLength);
  }
  return { active, due: !active && lapsSinceDeload >= everyLaps, lapsSinceDeload };
}
