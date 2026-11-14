import type { EntryExercise, Exercise, WorkoutSet } from '../../types';
import type { ExerciseHint } from '../../workout/prefill';
import { SetRow } from './SetRow';
import { summarizeSets } from './format';

export function ExerciseBlock(p: {
  exercise: Exercise | undefined;
  block: EntryExercise;
  hint?: ExerciseHint;
  trophy: boolean;
  lightRatio: number | null;
  isFirst: boolean;
  isLast: boolean;
  onChange(b: EntryExercise): void;
  onMove(dir: -1 | 1): void;
  onRemove(): void;
  onEditExercise?(): void;
}) {
  const ex = p.exercise;
  const name = ex?.name ?? '(알 수 없는 운동)';
  let workNo = 0;
  const setSets = (sets: WorkoutSet[]) => p.onChange({ ...p.block, sets });
  const last = ex && p.hint?.lastSets ? summarizeSets(ex, p.hint.lastSets) : '';

  return (
    <article className="ex-block">
      <header>
        <button className="ex-name" onClick={p.onEditExercise}>{name}</button>
        {p.trophy && <span aria-label="신기록" title="신기록">🏆</span>}
        <span className="spacer" />
        <button className="icon" aria-label={`${name} 위로`} disabled={p.isFirst} onClick={() => p.onMove(-1)}>↑</button>
        <button className="icon" aria-label={`${name} 아래로`} disabled={p.isLast} onClick={() => p.onMove(1)}>↓</button>
        <button className="icon" aria-label={`${name} 빼기`} onClick={p.onRemove}>×</button>
      </header>
      {ex?.note && <p className="note">📌 {ex.note}</p>}
      {(last || p.hint?.ready || p.hint?.bodyweightReady || p.lightRatio !== null) && (
        <p className="hint">
          {last && <span>지난번: {last}{p.hint?.lastDate ? ` (${p.hint.lastDate.slice(5).replace('-', '/')})` : ''}</span>}
          {p.hint?.ready && <strong className="up">⬆ 무게 올릴 차례</strong>}
          {p.hint?.bodyweightReady && <strong className="up">추가 무게 고려</strong>}
          {p.lightRatio !== null && <span className="ratio">추정 1RM의 {Math.round(p.lightRatio * 100)}%</span>}
        </p>
      )}
      {p.block.sets.map((s, i) => (
        <SetRow key={i} type={ex?.type ?? 'weight'} measure={ex?.measure} set={s} number={s.isWarmup ? null : ++workNo} incrementKg={ex?.incrementKg || 2.5}
          onChange={(ns) => setSets(p.block.sets.map((x, j) => (j === i ? ns : x)))}
          onRemove={() => setSets(p.block.sets.filter((_, j) => j !== i))} />
      ))}
      <button className="add-set" onClick={() => {
        const lastSet = p.block.sets[p.block.sets.length - 1];
        setSets([...p.block.sets, lastSet ? { ...lastSet, isWarmup: false } : { isWarmup: false }]);
      }}>+ 세트</button>
    </article>
  );
}
