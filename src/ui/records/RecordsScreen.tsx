import { useMemo, useState } from 'react';
import { live } from '../../data/repo';
import { computePRs, type PRs } from '../../workout/records';
import type { Exercise, ISODate } from '../../types';
import { fmtNum, formatPace } from '../entry/format';
import { ExerciseDetail } from './ExerciseDetail';

const md = (d: string) => d.slice(5).replace('-', '/');

function PRLines({ ex, pr }: { ex: Exercise; pr: PRs }) {
  const items: [string, string | undefined, string | undefined][] =
    ex.type === 'weight' ? [
      ['최고 무게', pr.maxWeight && `${fmtNum(pr.maxWeight.value)}kg × ${pr.maxWeight.reps}회`, pr.maxWeight?.date],
      ['최고 횟수', pr.maxReps && `${pr.maxReps.value}회`, pr.maxReps?.date],
      ['추정 1RM', pr.bestE1rm && `${fmtNum(Math.round(pr.bestE1rm.value * 10) / 10)}kg`, pr.bestE1rm?.date],
    ] : ex.type === 'bodyweight' ? [
      ['최고 횟수', pr.maxReps && `${pr.maxReps.value}회`, pr.maxReps?.date],
      ['최고 추가 무게', pr.maxAddedWeight && `+${fmtNum(pr.maxAddedWeight.value)}kg`, pr.maxAddedWeight?.date],
    ] : [
      ['최장 시간', pr.longestDuration && `${fmtNum(Math.round(pr.longestDuration.value / 60))}분`, pr.longestDuration?.date],
      ['최장 거리', pr.longestDistance && `${fmtNum(pr.longestDistance.value)}km`, pr.longestDistance?.date],
      ['최고 페이스', pr.bestPace && formatPace(pr.bestPace.value), pr.bestPace?.date],
    ];
  return (
    <dl className="prs">
      {items.filter(([, v]) => v).map(([k, v, d]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd><dd className="muted small">{d && md(d)}</dd></div>
      ))}
    </dl>
  );
}

export function RecordsScreen({ onOpenDate }: { onOpenDate(d: ISODate): void }) {
  const exercisesQ = live.exercises({ includeDeleted: true });
  const entriesQ = live.entries();
  const routinesQ = live.routines();
  const [selected, setSelected] = useState<string | null>(null);

  const cards = useMemo(() => {
    const entries = entriesQ ?? [];
    const last = new Map<string, string>();
    for (const e of entries) for (const b of e.exercises) if ((last.get(b.exerciseId) ?? '') < e.date) last.set(b.exerciseId, e.date);
    return (exercisesQ ?? [])
      .filter((ex) => last.has(ex.id))
      .map((ex) => ({ ex, last: last.get(ex.id)!, pr: computePRs(ex, entries) }))
      .sort((a, b) => b.last.localeCompare(a.last));
  }, [exercisesQ, entriesQ]);
  const routines = useMemo(() => new Map((routinesQ ?? []).map((r) => [r.id, r])), [routinesQ]);

  const sel = cards.find((c) => c.ex.id === selected);
  if (sel) {
    return (
      <section className="screen records">
        <ExerciseDetail exercise={sel.ex} entries={entriesQ ?? []} routines={routines} onOpenDate={onOpenDate} onBack={() => setSelected(null)} />
      </section>
    );
  }
  return (
    <section className="screen records">
      <h2>최고 기록</h2>
      {exercisesQ && entriesQ && cards.length === 0 && <p className="muted">아직 기록이 없어요. 달력에서 날짜를 눌러 운동을 기록해 보세요.</p>}
      <div className="cards">
        {cards.map(({ ex, last, pr }) => (
          <button key={ex.id} className="card" onClick={() => setSelected(ex.id)} aria-label={`${ex.name} 기록 보기`}>
            <header><strong>{ex.name}</strong><span className="muted small">마지막 {md(last)}</span></header>
            <PRLines ex={ex} pr={pr} />
          </button>
        ))}
      </div>
    </section>
  );
}
