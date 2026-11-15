import { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { afterMove, afterRemove, type Open } from './accordion';
import { repo } from '../../data/repo';
import { dayTitle } from '../../lib/date';
import { bestE1rmBefore } from '../../workout/records';
import { defaultRangeFromSets } from '../../workout/prefill';
import { measureOf } from '../../workout/measure';
import type { EntryExercise, Exercise, ISODate, Routine } from '../../types';
import { useEntryDraft } from './useEntryDraft';
import { ExerciseBlock } from './ExerciseBlock';
import { QuickAdd } from './QuickAdd';
import { ExerciseForm } from '../exercise/ExerciseForm';
import { routineTitle } from '../../workout/routineTitle';

export function EntryModal({ date, onClose }: { date: ISODate; onClose(): void }) {
  const s = useEntryDraft(date);
  const [registering, setRegistering] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  // 한 번에 한 운동만 펼친다. 처음엔 첫 운동
  const [openIdx, setOpenIdx] = useState<Open>(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const title = dayTitle(date);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const [quickPending, setQuickPending] = useState(false);
  const close = async () => {
    if (quickPending && !window.confirm('추가하지 않은 운동이 있어요. 닫을까요?')) return;
    if (await s.flush()) onClose();
  };
  const routine = s.routines.find((r) => r.id === s.draft.routineId);
  const isRest = routine?.kind === 'rest';
  const deloadSuggested = !!s.status && !s.status.deload.active && (s.status.deload.due || s.status.stallSignal);

  const setBlocks = (fn: (bs: EntryExercise[]) => EntryExercise[]) =>
    s.update((d) => ({ ...d, exercises: fn(d.exercises).map((b, i) => ({ ...b, order: i })) }));

  const lightRatio = (b: EntryExercise): number | null => {
    const ex = s.exercises.get(b.exerciseId);
    if (routine?.intensity !== 'light' || !s.settings?.showLightRatio || ex?.type !== 'weight') return null;
    const best = bestE1rmBefore(ex, s.entries, date);
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
        {s.saveError && <p className="error" role="alert">저장에 실패했어요. 내용을 고치거나 닫으면 다시 시도해요.</p>}
        {!s.ready ? <p className="muted">불러오는 중…</p> : (<>
          <div className="row">
            <select aria-label="루틴" value={s.draft.routineId ?? ''} onChange={(e) => { s.selectRoutine(e.target.value || null); setOpenIdx(0); }}>
              <option value="">루틴 없음</option>
              {s.routines.filter((r) => !r.deletedAt || r.id === s.draft.routineId).map((r) => (
                <option key={r.id} value={r.id} disabled={!!r.deletedAt}>{r.deletedAt ? `${routineTitle(r)} (삭제된 루틴)` : routineTitle(r)}</option>
              ))}
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
              if (!e.over || e.active.id === e.over.id) return;
              const from = Number(String(e.active.id).slice(1)), to = Number(String(e.over.id).slice(1));
              setBlocks((bs) => arrayMove(bs, from, to));
              setOpenIdx((o) => afterMove(o, from, to));
            }}>
              <SortableContext items={s.draft.exercises.map((_, i) => `b${i}`)} strategy={verticalListSortingStrategy}>
                {s.draft.exercises.map((b, i) => (
                  <ExerciseBlock key={`${b.exerciseId}-${i}`} sortId={`b${i}`} exercise={s.exercises.get(b.exerciseId)} block={b} hint={s.hints[b.exerciseId]}
                    trophy={!!s.trophies[b.exerciseId]} lightRatio={lightRatio(b)}
                    open={openIdx === i} onToggle={() => setOpenIdx((o) => (o === i ? null : i))}
                    onChange={(nb) => setBlocks((bs) => bs.map((x, j) => (j === i ? nb : x)))}
                    onRemove={() => { setBlocks((bs) => bs.filter((_, j) => j !== i)); setOpenIdx((o) => afterRemove(o, i)); }}
                    onEditExercise={() => setEditing(s.exercises.get(b.exerciseId) ?? null)} />
                ))}
              </SortableContext>
            </DndContext>
            {editing && <ExerciseForm key={editing.id} initial={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
            <QuickAdd date={date} entries={s.entries} exercises={s.exercises} onPendingChange={setQuickPending} onAdd={(ex, sets) => {
              // 같은 운동이 이미 있으면 그 운동에 세트를 이어 붙이고, 그 운동을 펼친다
              const bs = s.draft.exercises;
              const i = bs.findIndex((b) => b.exerciseId === ex.id);
              setOpenIdx(i < 0 ? bs.length : i);
              setBlocks((cur) => {
                const k = cur.findIndex((b) => b.exerciseId === ex.id);
                if (k < 0) return [...cur, { exerciseId: ex.id, order: cur.length, sets }];
                return cur.map((b, j) => (j === k ? { ...b, sets: [...b.sets, ...sets] } : b));
              });
            }} />
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
    const range = prev ? { min: prev.targetRepsMin, max: prev.targetRepsMax } : defaultRangeFromSets(b.sets, s.settings!, measureOf(s.exercises.get(b.exerciseId)));
    return { exerciseId: b.exerciseId, order, targetRepsMin: range.min, targetRepsMax: range.max };
  });

  const saveNew = async () => {
    if (!name.trim()) return;
    const order = Math.max(-1, ...s.routines.filter((r) => !r.deletedAt).map((r) => r.order)) + 1;
    const r = await repo.saveRoutine({ name: name.trim(), kind: 'workout', intensity: intensity || null, order, items: items() });
    s.update((d) => ({ ...d, routineId: r.id }), { touchesSets: false });
    onDone();
  };
  const overwrite = async () => {
    if (!routine || !window.confirm(`"${routineTitle(routine)}" 루틴을 지금 구성으로 바꿀까요?`)) return;
    await repo.saveRoutine({ ...routine, intensity: intensity || null, items: items() });
    onDone();
  };

  return (
    <fieldset className="panel" role="group" aria-label="루틴 등록">
      <legend>루틴 등록</legend>
      <div className="row">
        <input aria-label="새 루틴 이름" placeholder="예: 가슴·삼두 (강도는 옆에서)" value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="강도" value={intensity} onChange={(e) => setIntensity(e.target.value as 'heavy' | 'light' | '')}>
          <option value="">강도 없음</option><option value="heavy">고중량</option><option value="light">저중량</option>
        </select>
      </div>
      <div className="row">
        <button className="primary" onClick={() => void saveNew()} disabled={!name.trim() || s.draft.exercises.length === 0}>새 루틴으로 저장</button>
        {routine?.kind === 'workout' && <button className="chip" onClick={() => void overwrite()}>"{routineTitle(routine)}" 덮어쓰기</button>}
      </div>
    </fieldset>
  );
}
