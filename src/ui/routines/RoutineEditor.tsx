import { useState } from 'react';
import { repo } from '../../data/repo';
import { parseNum } from '../../lib/number';
import type { Exercise, Routine, RoutineItem } from '../../types';
import { ExercisePicker } from '../exercise/ExercisePicker';

type Draft = { exerciseId: string; min: string; max: string };

export function RoutineEditor(p: { routine?: Routine; nextOrder: number; exercises: Map<string, Exercise>; onDone(): void }) {
  const r = p.routine;
  const [name, setName] = useState(r?.name ?? '');
  const [intensity, setIntensity] = useState<'heavy' | 'light' | ''>(r?.intensity ?? '');
  const [items, setItems] = useState<Draft[]>(
    [...(r?.items ?? [])].sort((a, b) => a.order - b.order).map((i) => ({ exerciseId: i.exerciseId, min: String(i.targetRepsMin), max: String(i.targetRepsMax) })),
  );
  const [error, setError] = useState('');
  const label = r ? `${r.name} 편집` : '새 루틴';

  const move = (i: number, dir: -1 | 1) => setItems((xs) => { const c = [...xs]; [c[i], c[i + dir]] = [c[i + dir], c[i]]; return c; });
  const setField = (i: number, f: 'min' | 'max', v: string) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [f]: v } : x)));

  const save = async () => {
    if (!name.trim()) return setError('루틴 이름을 입력해 주세요');
    const parsed: RoutineItem[] = [];
    for (const [order, it] of items.entries()) {
      const min = parseNum(it.min); const max = parseNum(it.max);
      if (min === undefined || max === undefined || !Number.isInteger(min) || !Number.isInteger(max) || min < 1 || min > max) {
        return setError(`${p.exercises.get(it.exerciseId)?.name ?? '운동'}: 목표 횟수 범위를 확인해 주세요 (최소 ≤ 최대)`);
      }
      parsed.push({ exerciseId: it.exerciseId, order, targetRepsMin: min, targetRepsMax: max });
    }
    await repo.saveRoutine({ ...(r ?? { kind: 'workout' as const, order: p.nextOrder }), name: name.trim(), intensity: intensity || null, items: parsed });
    p.onDone();
  };

  return (
    <fieldset className="panel" role="group" aria-label={label}>
      <legend>{label}</legend>
      <div className="row">
        <input aria-label="루틴 이름" placeholder="예: 가슴·삼두 고중량" value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="강도" value={intensity} onChange={(e) => setIntensity(e.target.value as 'heavy' | 'light' | '')}>
          <option value="">강도 없음</option><option value="heavy">고중량</option><option value="light">저중량</option>
        </select>
      </div>
      <ul className="item-list">
        {items.map((it, i) => {
          const n = p.exercises.get(it.exerciseId)?.name ?? '(알 수 없는 운동)';
          return (
            <li key={it.exerciseId + i} className="row">
              <span className="item-name">{n}</span>
              <span className="muted">목표</span>
              <input aria-label={`${n} 목표 최소`} inputMode="numeric" value={it.min} style={{ width: '3em' }} onChange={(e) => setField(i, 'min', e.target.value)} />
              ~
              <input aria-label={`${n} 목표 최대`} inputMode="numeric" value={it.max} style={{ width: '3em' }} onChange={(e) => setField(i, 'max', e.target.value)} />
              <span className="muted">{p.exercises.get(it.exerciseId)?.measure === 'seconds' ? 's' : '회'}</span>
              <button className="icon" aria-label={`${n} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button className="icon" aria-label={`${n} 아래로`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button className="icon" aria-label={`${n} 빼기`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>×</button>
            </li>
          );
        })}
      </ul>
      <ExercisePicker onPick={(ex) => setItems((xs) => xs.some((x) => x.exerciseId === ex.id) ? xs : [...xs, { exerciseId: ex.id, min: '8', max: '10' }])} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="primary" onClick={() => void save()}>루틴 저장</button>
        <button className="chip" onClick={p.onDone}>취소</button>
      </div>
    </fieldset>
  );
}
