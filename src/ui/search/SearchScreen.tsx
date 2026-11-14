import { useMemo, useState } from 'react';
import { live } from '../../data/repo';
import { searchEntries } from '../../workout/search';
import type { ISODate } from '../../types';

export function SearchScreen({ onOpenDate }: { onOpenDate(d: ISODate): void }) {
  const [q, setQ] = useState('');
  const entries = live.entries();
  const exercisesQ = live.exercises({ includeDeleted: true });
  const results = useMemo(
    () => searchEntries(q, entries ?? [], new Map((exercisesQ ?? []).map((e) => [e.id, e]))),
    [q, entries, exercisesQ],
  );
  return (
    <section className="screen search">
      <h2>검색</h2>
      <input type="search" aria-label="검색어" placeholder="운동 이름이나 메모" value={q} onChange={(e) => setQ(e.target.value)} className="search-input" />
      {q.trim() && <p className="muted small">{results.length}개</p>}
      <ul className="history">
        {results.map((r) => (
          <li key={r.date}>
            <button onClick={() => onOpenDate(r.date)}>
              <span className="date">{r.date.slice(2).replaceAll('-', '/')}</span>
              <span className="what">{r.snippet}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
