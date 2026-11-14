import { useMemo, useState } from 'react';
import { live } from '../../data/repo';
import { addDays, addMonthsISO, dayLabel, monthGrid, monthTitle, startOfMonthISO, todayISO, toLocalDate } from '../../lib/date';
import { computeStatus } from '../../workout/status';
import type { Entry, ISODate } from '../../types';
import { DEFAULT_SETTINGS } from '../../types';
import { Banners } from './Banners';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarScreen({ onOpenDate, today = todayISO() }: { onOpenDate(date: ISODate): void; today?: ISODate }) {
  const [month, setMonth] = useState(() => startOfMonthISO(today));
  const routines = live.routines({ includeDeleted: true });
  const entries = live.entries();
  const exercises = live.exercises({ includeDeleted: true });
  const settings = live.settings() ?? { ...DEFAULT_SETTINGS, updatedAt: 0 };

  const byDate = useMemo(() => new Map((entries ?? []).map((e) => [e.date, e])), [entries]);
  const todayLogged = byDate.has(today);
  const status = useMemo(
    () => computeStatus(routines ?? [], entries ?? [], todayLogged ? addDays(today, 1) : today, settings),
    [routines, entries, today, todayLogged, settings],
  );
  const inferred = new Set(status.inferredRestDates);
  const routineName = new Map((routines ?? []).map((r) => [r.id, r.name]));
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const label = (e: Entry) =>
    (e.routineId && routineName.get(e.routineId)) || (e.exercises[0] && exName.get(e.exercises[0].exerciseId)) || (e.memo ? '메모' : '');

  const days = monthGrid(month);

  return (
    <section className="screen calendar">
      {routines && entries && (
        <Banners status={status} routines={routines} todayLogged={todayLogged} settings={settings}
          hasEntries={entries.length > 0} today={toLocalDate(today)} />
      )}
      <header className="month-bar">
        <button aria-label="이전 달" onClick={() => setMonth((m) => addMonthsISO(m, -1))}>‹</button>
        <h2>{monthTitle(month)}</h2>
        <button aria-label="다음 달" onClick={() => setMonth((m) => addMonthsISO(m, 1))}>›</button>
      </header>
      <div className="grid week-head">{WEEK.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid">
        {days.map(({ date: iso, inMonth }) => {
          const e = byDate.get(iso);
          const cls = ['cell', inMonth ? '' : 'other', iso === today ? 'today' : '', e?.isDeload ? 'deload' : ''].join(' ');
          return (
            <button key={iso} className={cls} aria-label={dayLabel(iso)} onClick={() => onOpenDate(iso)}>
              <span className="day">{Number(iso.slice(8))}</span>
              {e && <span className="cell-label">{label(e)}</span>}
              {!e && inferred.has(iso) && <span className="cell-label inferred">휴식</span>}
              {e?.isDeload && <span className="badge">D</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
