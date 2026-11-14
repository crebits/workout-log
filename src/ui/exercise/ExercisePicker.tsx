import { useMemo, useState } from 'react';
import { live, repo } from '../../data/repo';
import type { Exercise } from '../../types';
import { ExerciseForm } from './ExerciseForm';

const MAX = 8;

export function ExercisePicker({ onPick }: { onPick(ex: Exercise): void }) {
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const exercises = live.exercises();
  const entries = live.entries();

  const lastUsed = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries ?? []) for (const b of e.exercises) if ((m.get(b.exerciseId) ?? '') < e.date) m.set(b.exerciseId, e.date);
    return m;
  }, [entries]);

  const query = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    return (exercises ?? [])
      .filter((e) => e.name.toLowerCase().includes(query))
      .sort((a, b) => (lastUsed.get(b.id) ?? '').localeCompare(lastUsed.get(a.id) ?? '') || a.name.localeCompare(b.name, 'ko'))
      .slice(0, MAX);
  }, [exercises, query, lastUsed]);
  const exact = matches.some((e) => e.name.toLowerCase() === query);

  const pick = (ex: Exercise) => { setQ(''); setCreating(null); onPick(ex); };

  if (creating !== null) {
    return <ExerciseForm initialName={creating} onSaved={pick} onCancel={() => setCreating(null)} />;
  }
  return (
    <div className="picker">
      <input aria-label="운동 추가" placeholder="+ 운동 추가 (이름 입력)" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key !== 'Enter' || !query) return;
          // Enter는 정확히 같은 이름만 고른다. 일부만 같으면 새 운동으로 (목록에서 눌러 고를 수 있음)
          const found = await repo.findExerciseByName(q);
          if (found) pick(found); else setCreating(q.trim());
        }} />
      {query && (
        <ul role="listbox" aria-label="운동 목록">
          {matches.map((e) => (
            <li key={e.id} role="option" aria-selected={false} onClick={() => pick(e)}>{e.name}</li>
          ))}
          {!exact && <li role="option" aria-selected={false} className="new" onClick={() => setCreating(q.trim())}>새 운동: {q.trim()}</li>}
        </ul>
      )}
    </div>
  );
}
