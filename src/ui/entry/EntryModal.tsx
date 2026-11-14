import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { repo } from '../../data/repo';
import { toLocalDate } from '../../lib/date';
import { bestE1rmBefore } from '../../workout/records';
import { defaultRangeFromSets } from '../../workout/prefill';
import type { EntryExercise, Exercise, ISODate, Routine } from '../../types';
import { DEFAULT_INCREMENT_KG } from '../../types';
import { useEntryDraft } from './useEntryDraft';
import { ExerciseBlock } from './ExerciseBlock';

export interface ExercisePickerSlot { (props: { onPick(ex: Exercise): void }): React.ReactNode }

/** Task 10에서 자동완성으로 교체되는 임시 입력: 이름 + Enter */
function SimpleExerciseInput({ onPick }: { onPick(ex: Exercise): void }) {
  const [name, setName] = useState('');
  return (
    <input aria-label="운동 추가" placeholder="+ 운동 추가" value={name} onChange={(e) => setName(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key !== 'Enter' || !name.trim()) return;
        const ex = (await repo.findExerciseByName(name)) ??
          (await repo.saveExercise({ name, type: 'weight', incrementKg: DEFAULT_INCREMENT_KG, primaryMuscles: [], secondaryMuscles: [], note: '' }));
        setName('');
        onPick(ex);
      }} />
  );
}

export function EntryModal({ date, onClose, Picker = SimpleExerciseInput, onEditExercise }: {
  date: ISODate;
  onClose(): void;
  Picker?: ExercisePickerSlot;
  onEditExercise?(ex: Exercise): void;
}) {
  const s = useEntryDraft(date);
  const [registering, setRegistering] = useState(false);
  const title = format(toLocalDate(date), 'M월 d일 (E)', { locale: ko });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = async () => { await s.flush(); onClose(); };
  const routine = s.routines.find((r) => r.id === s.draft.routineId);
  const isRest = routine?.kind === 'rest';
  const deloadSuggested = !!s.status && !s.status.deload.active && (s.status.deload.due || s.status.stallSignal);

  const setBlocks = (fn: (bs: EntryExercise[]) => EntryExercise[]) =>
    s.update((d) => ({ ...d, exercises: fn(d.exercises).map((b, i) => ({ ...b, order: i })) }));

  const lightRatio = (b: EntryExercise): number | null => {
    const ex = s.exercises.get(b.exerciseId);
    if (routine?.intensity !== 'light' || !s.settings?.showLightRatio || ex?.type !== 'weight') return null;
    const best = bestE1rmBefore(b.exerciseId, s.entries, date);
    const top = Math.max(0, ...b.sets.filter((x) => !x.isWarmup).map((x) => x.weightKg ?? 0));
    return best && top ? top / best : null;
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) void close(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon" aria-label="닫기" onClick={() => void close()}>✕</button>
        </header>
        {!s.ready ? <p className="muted">불러오는 중…</p> : (<>
          <div className="row">
            <select aria-label="루틴" value={s.draft.routineId ?? ''} onChange={(e) => s.selectRoutine(e.target.value || null)}>
              <option value="">루틴 없음</option>
              {s.routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {!isRest && <button className="chip" onClick={() => setRegistering((v) => !v)}>⭐ 루틴 등록</button>}
          </div>
          {!isRest && (
            <label className="row deload">
              <input type="checkbox" checked={s.draft.isDeload} onChange={(e) => s.setDeload(e.target.checked)} />
              디로드
              {deloadSuggested && <span className="tag warn">디로드 차례</span>}
            </label>
          )}
          {registering && <RegisterPanel s={s} routine={routine} onDone={() => setRegistering(false)} />}

          {isRest ? <p className="muted">휴식한 날로 기록합니다.</p> : (<>
            {s.draft.exercises.map((b, i) => (
              <ExerciseBlock key={`${b.exerciseId}-${i}`} exercise={s.exercises.get(b.exerciseId)} block={b} hint={s.hints[b.exerciseId]}
                trophy={!!s.trophies[b.exerciseId]} lightRatio={lightRatio(b)} isFirst={i === 0} isLast={i === s.draft.exercises.length - 1}
                onChange={(nb) => setBlocks((bs) => bs.map((x, j) => (j === i ? nb : x)))}
                onMove={(dir) => setBlocks((bs) => { const c = [...bs]; [c[i], c[i + dir]] = [c[i + dir], c[i]]; return c; })}
                onRemove={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}
                onEditExercise={() => { const ex = s.exercises.get(b.exerciseId); if (ex && onEditExercise) onEditExercise(ex); }} />
            ))}
            <Picker onPick={(ex) => setBlocks((bs) => [...bs, { exerciseId: ex.id, order: bs.length, sets: [{ isWarmup: false }] }])} />
          </>)}

          <textarea aria-label="메모" placeholder="메모 (컨디션, 식단, 통증…)" rows={3} value={s.draft.memo}
            onChange={(e) => s.update((d) => ({ ...d, memo: e.target.value }), { touchesSets: false })} />
          {!s.dirty && (s.draft.exercises.length > 0 || isRest) && (
            <button className="primary" onClick={s.confirmAsIs}>그대로 완료</button>
          )}
        </>)}
      </div>
    </div>
  );
}

function RegisterPanel({ s, routine, onDone }: { s: ReturnType<typeof useEntryDraft>; routine: Routine | undefined; onDone(): void }) {
  const [name, setName] = useState('');
  const [intensity, setIntensity] = useState<'heavy' | 'light' | ''>(routine?.intensity ?? '');
  const items = () => s.draft.exercises.map((b, order) => {
    const prev = routine?.items.find((i) => i.exerciseId === b.exerciseId);
    const range = prev ? { min: prev.targetRepsMin, max: prev.targetRepsMax } : defaultRangeFromSets(b.sets, s.settings!);
    return { exerciseId: b.exerciseId, order, targetRepsMin: range.min, targetRepsMax: range.max };
  });

  const saveNew = async () => {
    if (!name.trim()) return;
    const order = Math.max(-1, ...s.routines.map((r) => r.order)) + 1;
    const r = await repo.saveRoutine({ name: name.trim(), kind: 'workout', intensity: intensity || null, order, items: items() });
    s.update((d) => ({ ...d, routineId: r.id }), { touchesSets: false });
    onDone();
  };
  const overwrite = async () => {
    if (!routine || !window.confirm(`"${routine.name}" 루틴을 지금 구성으로 바꿀까요?`)) return;
    await repo.saveRoutine({ ...routine, intensity: intensity || null, items: items() });
    onDone();
  };

  return (
    <fieldset className="panel" role="group" aria-label="루틴 등록">
      <legend>루틴 등록</legend>
      <div className="row">
        <input aria-label="새 루틴 이름" placeholder="예: 가슴·삼두 고중량" value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="강도" value={intensity} onChange={(e) => setIntensity(e.target.value as 'heavy' | 'light' | '')}>
          <option value="">강도 없음</option><option value="heavy">고중량</option><option value="light">저중량</option>
        </select>
      </div>
      <div className="row">
        <button className="primary" onClick={() => void saveNew()} disabled={!name.trim() || s.draft.exercises.length === 0}>새 루틴으로 저장</button>
        {routine?.kind === 'workout' && <button className="chip" onClick={() => void overwrite()}>"{routine.name}" 덮어쓰기</button>}
      </div>
    </fieldset>
  );
}
