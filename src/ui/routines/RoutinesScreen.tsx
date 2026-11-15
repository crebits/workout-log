import { useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { live, repo } from '../../data/repo';
import type { Routine } from '../../types';
import { RoutineEditor } from './RoutineEditor';
import { routineTitle } from '../../workout/routineTitle';


function Row(p: { r: Routine; index: number; count: number; onMove(dir: -1 | 1): void; onEdit(): void; onDelete(): void }) {
  const title = routineTitle(p.r);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.r.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`routine-row ${p.r.kind}`}>
      <button className="handle" aria-label={`${title} 끌어서 순서 바꾸기`} {...attributes} {...listeners}>≡</button>
      <span className="no">{p.index + 1}</span>
      <span className="name">{title}</span>
      {p.r.kind === 'workout' && <span className="muted small">{p.r.items.length}개</span>}
      <span className="spacer" />
      <button className="icon" aria-label={`${title} 위로`} disabled={p.index === 0} onClick={() => p.onMove(-1)}>↑</button>
      <button className="icon" aria-label={`${title} 아래로`} disabled={p.index === p.count - 1} onClick={() => p.onMove(1)}>↓</button>
      {p.r.kind === 'workout' && <button className="icon" aria-label={`${title} 편집`} onClick={p.onEdit}>✎</button>}
      <button className="icon" aria-label={`${title} 삭제`} onClick={p.onDelete}>×</button>
    </li>
  );
}

export function RoutinesScreen() {
  const routines = live.routines();
  const exercisesQ = live.exercises({ includeDeleted: true });
  const exercises = useMemo(() => new Map((exercisesQ ?? []).map((e) => [e.id, e])), [exercisesQ]);
  const [editing, setEditing] = useState<Routine | 'new' | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const list = routines ?? [];
  const nextOrder = Math.max(-1, ...list.map((r) => r.order)) + 1;

  const reorder = (ids: string[]) => void repo.reorderRoutines(ids);
  const move = (i: number, dir: -1 | 1) => reorder(arrayMove(list, i, i + dir).map((r) => r.id));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((r) => r.id === e.active.id);
    const to = list.findIndex((r) => r.id === e.over!.id);
    reorder(arrayMove(list, from, to).map((r) => r.id));
  };
  const remove = (r: Routine) => {
    if (window.confirm(`"${routineTitle(r)}"을(를) 루틴 목록에서 뺄까요? 지난 기록은 그대로 남아요.`)) void repo.deleteRoutine(r.id);
  };

  return (
    <section className="screen routines">
      <h2>루틴</h2>
      <p className="muted small">위에서 아래로 순서대로 돌아가고, 마지막 다음은 처음으로 돌아옵니다.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={list.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="routine-list">
            {list.map((r, i) => (
              <Row key={r.id} r={r} index={i} count={list.length} onMove={(d) => move(i, d)} onEdit={() => setEditing(r)} onDelete={() => remove(r)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {editing && (
        <RoutineEditor key={editing === 'new' ? 'new' : editing.id} routine={editing === 'new' ? undefined : editing}
          nextOrder={nextOrder} exercises={exercises} onDone={() => setEditing(null)} />
      )}
      {routines && <div className="row">
        <button className="chip" onClick={() => setEditing('new')}>+ 루틴</button>
        <button className="chip" onClick={() => void repo.saveRoutine({ name: '휴식', kind: 'rest', intensity: null, order: nextOrder, items: [] })}>+ 휴식</button>
      </div>}
    </section>
  );
}
