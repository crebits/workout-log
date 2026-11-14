import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Entry, Exercise, Routine } from '../../types';
import { compareISO } from '../../lib/date';
import { chartSeries, METRICS_FOR, type Metric } from '../../workout/series';
import { summarizeSets, formatPace, fmtNum } from '../entry/format';

const INTENSITY: Record<string, string> = { heavy: '고중량', light: '저중량' };

export function ExerciseDetail(p: { exercise: Exercise; entries: Entry[]; routines: Map<string, Routine>; onOpenDate(d: string): void; onBack(): void }) {
  const metrics = METRICS_FOR[p.exercise.type];
  const [metric, setMetric] = useState<Metric>(metrics[0].metric);
  const data = useMemo(() => chartSeries(p.exercise, p.entries, metric), [p.exercise, p.entries, metric]);
  const rows = useMemo(
    () => p.entries.filter((e) => !e.deletedAt && e.exercises.some((b) => b.exerciseId === p.exercise.id)).sort((a, b) => compareISO(b.date, a.date)),
    [p.entries, p.exercise.id],
  );
  const fmt = (v: number) => (metric === 'pace' ? formatPace(v) : fmtNum(v));

  return (
    <div className="detail">
      <header className="row"><button className="chip" onClick={p.onBack}>‹ 목록</button><h2>{p.exercise.name}</h2></header>
      {metrics.length > 1 && (
        <div className="row" role="radiogroup" aria-label="그래프 항목">
          {metrics.map((m) => (
            <button key={m.metric} role="radio" aria-checked={metric === m.metric} className={`pill ${metric === m.metric ? 'on' : ''}`} onClick={() => setMetric(m.metric)}>{m.label}</button>
          ))}
        </div>
      )}
      {data.length >= 2 ? (
        <div className="chart" aria-label={`${metrics.find((m) => m.metric === metric)?.label} 그래프`}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace('-', '/')} fontSize={11} stroke="var(--muted)" />
              <YAxis domain={['auto', 'auto']} reversed={metric === 'pace'} tickFormatter={fmt} fontSize={11} stroke="var(--muted)" width={48} />
              <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(d) => String(d)} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="muted small">기록이 2번 이상 쌓이면 그래프가 보여요.</p>}
      <ul className="history">
        {rows.map((e) => {
          const r = e.routineId ? p.routines.get(e.routineId) : undefined;
          const sets = e.exercises.filter((b) => b.exerciseId === p.exercise.id).flatMap((b) => b.sets);
          return (
            <li key={e.id}>
              <button onClick={() => p.onOpenDate(e.date)}>
                <span className="date">{e.date.slice(5).replace('-', '/')}</span>
                <span className="what">{summarizeSets(p.exercise, sets)}</span>
                <span className="meta">
                  {r && <span>{r.name}</span>}
                  {r?.intensity && <span className="tag">{INTENSITY[r.intensity]}</span>}
                  {e.isDeload && <span className="tag warn">디로드</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
