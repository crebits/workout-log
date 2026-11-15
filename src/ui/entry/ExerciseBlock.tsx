import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  /** 끌어서 순서 바꾸기용 id */
  sortId: string;
  open: boolean;
  onToggle(): void;
  onChange(b: EntryExercise): void;
  onRemove(): void;
  onEditExercise?(): void;
}) {
  const ex = p.exercise;
  const name = ex?.name ?? '(알 수 없는 운동)';
  let workNo = 0;
  const setSets = (sets: WorkoutSet[]) => p.onChange({ ...p.block, sets });
  const last = ex && p.hint?.lastSets ? summarizeSets(ex, p.hint.lastSets) : '';
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.sortId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const handle = <button className="handle" aria-label={`${name} 끌어서 순서 바꾸기`} {...attributes} {...listeners}>≡</button>;

  if (!p.open) {
    const done = ex && p.block.sets.length ? summarizeSets(ex, p.block.sets) : '세트 없음';
    return (
      <article ref={setNodeRef} style={style} className="ex-block folded">
        <header>
          {handle}
          <button className="ex-fold" aria-expanded="false" aria-label={`${name} 펼치기: ${done}`} onClick={p.onToggle}>
            <span className="caret">▸</span>
            <span className="ex-name">{name}</span>
            <span className="ex-sum">{done}</span>
            {p.trophy && <span title="신기록">🏆</span>}
            {(p.hint?.ready || p.hint?.bodyweightReady) && <span className="up">⬆</span>}
          </button>
        </header>
      </article>
    );
  }

  return (
    <article ref={setNodeRef} style={style} className="ex-block">
      <header>
        {handle}
        <button className="icon caret" aria-expanded="true" aria-label={`${name} 접기`} onClick={p.onToggle}>▾</button>
        <button className="ex-name" onClick={p.onEditExercise}>{name}</button>
        {p.trophy && <span aria-label="신기록" title="신기록">🏆</span>}
        <span className="spacer" />
        <button className="icon" aria-label={`${name} 빼기`} onClick={p.onRemove}>×</button>
      </header>
      {ex?.note && <p className="note">📌 {ex.note}</p>}
      {(last || p.hint?.ready || p.hint?.bodyweightReady || p.lightRatio !== null) && (
        <p className="hint">
          {last && <span>{p.hint?.after ? '이후 기록' : '지난번'}: {last}{p.hint?.lastDate ? ` (${p.hint.lastDate.slice(5).replace('-', '/')})` : ''}</span>}
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
