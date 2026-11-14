import { useEffect, useState } from 'react';
import type { ExerciseType, WorkoutSet } from '../../types';
import { parseNum } from '../../lib/number';
import { paceSecPerKm } from '../../workout/records';
import { fmtNum, formatPace } from './format';
import { setMeasure } from '../../workout/measure';

type NumField = 'weightKg' | 'reps' | 'durationSec' | 'addedWeightKg' | 'durationMin' | 'distanceKm' | 'avgHeartRate' | 'maxHeartRate' | 'avgCadence';

function NumInput(p: { label: string; value: number | undefined; onChange(v: number | undefined): void; width?: string; integer?: boolean }) {
  const [text, setText] = useState(p.value === undefined ? '' : fmtNum(p.value));
  useEffect(() => {
    // 바깥에서 값이 바뀌었을 때만 표시를 맞춘다 (입력 중인 "62," 같은 중간 상태는 유지)
    if (parseNum(text) !== p.value) setText(p.value === undefined ? '' : fmtNum(p.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.value]);
  return (
    <input aria-label={p.label} inputMode={p.integer ? 'numeric' : 'decimal'} value={text} style={{ width: p.width ?? '4.2em' }}
      onChange={(e) => { setText(e.target.value); p.onChange(parseNum(e.target.value)); }} />
  );
}

export function SetRow(p: {
  type: ExerciseType;
  set: WorkoutSet;
  /** 본 세트 번호(1부터). 워밍업이면 null */
  number: number | null;
  incrementKg: number;
  /** 무게·맨몸 운동의 세는 방식 */
  measure?: 'reps' | 'seconds';
  onChange(s: WorkoutSet): void;
  onRemove(): void;
}) {
  const { set, number } = p;
  const name = number === null ? 'W' : `${number}세트`;
  const field = (f: NumField, label: string, unit: string, opts: { width?: string; integer?: boolean } = {}) => {
    const value = f === 'durationMin' ? (set.durationSec === undefined ? undefined : set.durationSec / 60) : set[f];
    return (
      <label className="field">
        <NumInput label={`${name} ${label}`} value={value} width={opts.width} integer={opts.integer}
          onChange={(v) => p.onChange(f === 'durationMin'
            ? { ...set, durationSec: v === undefined ? undefined : Math.round(v * 60) }
            : { ...set, [f]: v })} />
        <span className="unit">{unit}</span>
      </label>
    );
  };
  const pace = paceSecPerKm(set.durationSec, set.distanceKm);
  // 세트가 가진 값의 단위로 보여준다 (단위를 바꾼 운동의 옛 세트도 그대로 보이게)
  const timed = setMeasure(set, p.measure ?? 'reps') === 'seconds';
  const countField = timed
    ? field('durationSec', '시간(초)', 's', { integer: true, width: '3.4em' })
    : field('reps', '횟수', '회', { integer: true, width: '3.2em' });
  const countButton = timed
    ? <button className="chip" aria-label={`${name} +5s`} onClick={() => p.onChange({ ...set, durationSec: (set.durationSec ?? 0) + 5 })}>+5s</button>
    : <button className="chip" aria-label={`${name} +1회`} onClick={() => p.onChange({ ...set, reps: (set.reps ?? 0) + 1 })}>+1</button>;

  return (
    <div className={`set-row ${set.isWarmup ? 'warmup' : ''}`}>
      <button className="set-no" aria-label={set.isWarmup ? '워밍업 세트 (누르면 본 세트로)' : `${name} (누르면 워밍업으로)`}
        onClick={() => p.onChange({ ...set, isWarmup: !set.isWarmup })}>
        {number === null ? 'W' : number}
      </button>
      {p.type === 'weight' && (<>
        {field('weightKg', '무게', 'kg')}
        {countField}
        <button className="chip" aria-label={`${name} +${fmtNum(p.incrementKg)}kg`}
          onClick={() => p.onChange({ ...set, weightKg: Math.round(((set.weightKg ?? 0) + p.incrementKg) * 1000) / 1000 })}>+{fmtNum(p.incrementKg)}</button>
        {countButton}
      </>)}
      {p.type === 'bodyweight' && (<>
        {countField}
        {field('addedWeightKg', '추가 무게', '+kg')}
        {countButton}
      </>)}
      {p.type === 'cardio' && (<div className="cardio">
        {field('durationMin', '시간(분)', '분')}
        {field('distanceKm', '거리(km)', 'km')}
        {pace !== null && <span className="pace">{formatPace(pace)}</span>}
        {field('avgHeartRate', '평균 심박', '평균bpm', { integer: true })}
        {field('maxHeartRate', '최고 심박', '최고bpm', { integer: true })}
        {field('avgCadence', '케이던스', 'spm', { integer: true })}
      </div>)}
      <button className="icon" aria-label={`${name} 삭제`} onClick={p.onRemove}>×</button>
    </div>
  );
}
