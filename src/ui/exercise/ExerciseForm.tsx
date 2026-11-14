import { useState } from 'react';
import { repo } from '../../data/repo';
import { parseNum } from '../../lib/number';
import type { Exercise, ExerciseType } from '../../types';
import { DEFAULT_INCREMENT_KG, MUSCLES } from '../../types';

const TYPE_LABEL: Record<ExerciseType, string> = { weight: '무게 운동', bodyweight: '맨몸 운동', cardio: '유산소' };

export function ExerciseForm(p: { initial?: Exercise; initialName?: string; onSaved(ex: Exercise): void; onCancel(): void; onDeleted?(): void }) {
  const init = p.initial;
  const [name, setName] = useState(init?.name ?? p.initialName ?? '');
  const [type, setType] = useState<ExerciseType>(init?.type ?? 'weight');
  const [inc, setInc] = useState(String(init?.incrementKg ?? DEFAULT_INCREMENT_KG));
  const [measure, setMeasure] = useState<'reps' | 'seconds'>(init?.measure ?? 'reps');
  const [primary, setPrimary] = useState<string[]>(init?.primaryMuscles ?? []);
  const [secondary, setSecondary] = useState<string[]>(init?.secondaryMuscles ?? []);
  const [note, setNote] = useState(init?.note ?? '');
  const [error, setError] = useState('');

  const toggle = (list: string[], set: (v: string[]) => void, m: string) => set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  const save = async () => {
    if (!name.trim()) return setError('이름을 입력해 주세요');
    const dup = await repo.findExerciseByName(name);
    if (dup && dup.id !== init?.id) return setError('같은 이름의 운동이 이미 있어요');
    const ex = await repo.saveExercise({
      ...(init ?? {}), name, type, incrementKg: parseNum(inc) ?? DEFAULT_INCREMENT_KG, measure: type === 'cardio' ? undefined : measure,
      primaryMuscles: primary, secondaryMuscles: secondary.filter((m) => !primary.includes(m)), note: note.trim(),
    });
    p.onSaved(ex);
  };
  const remove = async () => {
    if (!init || !window.confirm(`"${init.name}" 운동을 삭제할까요? 지난 기록은 그대로 남아요.`)) return;
    await repo.deleteExercise(init.id);
    (p.onDeleted ?? p.onCancel)();
  };

  return (
    <fieldset className="panel exercise-form" role="group" aria-label="운동 정보">
      <legend>{init ? '운동 정보' : '새 운동'}</legend>
      <label className="stack">이름<input aria-label="이름" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="row">
        <label className="stack">종류
          <select aria-label="종류" value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
            {(Object.keys(TYPE_LABEL) as ExerciseType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        {type !== 'cardio' && (
          <label className="stack">세는 방식
            <select aria-label="세는 방식" value={measure} onChange={(e) => setMeasure(e.target.value as 'reps' | 'seconds')}>
              <option value="reps">횟수</option><option value="seconds">시간(초)</option>
            </select>
          </label>
        )}
        {type === 'weight' && (
          <label className="stack">증가 단위(kg)<input aria-label="증가 단위(kg)" inputMode="decimal" value={inc} onChange={(e) => setInc(e.target.value)} /></label>
        )}
      </div>
      {type !== 'cardio' && (<>
        <div className="muscles"><span className="muted">주 부위</span>
          {MUSCLES.map((m) => (
            <label key={m} className={`pill ${primary.includes(m) ? 'on' : ''}`}>
              <input type="checkbox" aria-label={`주 부위 ${m}`} checked={primary.includes(m)} onChange={() => toggle(primary, setPrimary, m)} />{m}
            </label>
          ))}
        </div>
        <div className="muscles"><span className="muted">보조 부위</span>
          {MUSCLES.map((m) => (
            <label key={m} className={`pill ${secondary.includes(m) ? 'on' : ''}`}>
              <input type="checkbox" aria-label={`보조 부위 ${m}`} checked={secondary.includes(m)} onChange={() => toggle(secondary, setSecondary, m)} />{m}
            </label>
          ))}
        </div>
      </>)}
      <label className="stack">고정 메모<input aria-label="고정 메모" placeholder="예: 의자 높이 4, 그립 넓게" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="primary" onClick={() => void save()}>저장</button>
        <button className="chip" onClick={p.onCancel}>취소</button>
        {init && <button className="danger" onClick={() => void remove()}>운동 삭제</button>}
      </div>
    </fieldset>
  );
}
