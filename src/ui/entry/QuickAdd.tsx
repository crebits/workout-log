import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_RANGE, repo } from '../../data/repo';
import { parseNum } from '../../lib/number';
import type { Entry, Exercise, ISODate, WorkoutSet } from '../../types';
import { measureOf, unitLabel } from '../../workout/measure';
import { buildQuickSets, isValidSetCount, quickDefaults, type QuickValues } from '../../workout/quickAdd';
import { workingSets, countsForRecords } from '../../workout/records';
import { compareISO } from '../../lib/date';
import { ExercisePicker } from '../exercise/ExercisePicker';
import { fmtNum, summarizeSets } from './format';

type Field = 'weightKg' | 'count' | 'setCount' | 'durationMin' | 'distanceKm';
const toText = (v: number | undefined) => (v === undefined ? '' : fmtNum(v));

/** 운동 이름(자동완성) + 무게 + 횟수(또는 초) + 세트 수를 한 줄로 추가 */
export function QuickAdd(p: {
  date: ISODate; entries: Entry[]; exercises: Map<string, Exercise>;
  onAdd(ex: Exercise, sets: WorkoutSet[]): void;
  /** 운동을 골라 놓고 아직 추가하지 않은 상태인지 */
  onPendingChange?(pending: boolean): void;
}) {
  const [picked, setPicked] = useState<Exercise | null>(null);
  // 단위를 바꾸면 live 목록이 갱신되므로 최신 운동 정보를 쓴다
  const ex = picked ? (p.exercises.get(picked.id) ?? picked) : null;
  const measure = measureOf(ex ?? undefined);
  const defaults = useMemo(() => (ex ? quickDefaults(ex, p.entries, p.date) : null), [ex, p.entries, p.date]);
  const [text, setText] = useState<Record<Field, string>>({ weightKg: '', count: '', setCount: '', durationMin: '', distanceKm: '' });
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => { p.onPendingChange?.(picked !== null); }, [picked, p]);

  // 운동을 고르면 기본값으로 채운다
  useEffect(() => {
    if (!defaults) return;
    setNotice(null);
    setText({
      weightKg: toText(defaults.weightKg), count: toText(defaults.count), setCount: String(defaults.setCount),
      durationMin: toText(defaults.durationMin), distanceKm: toText(defaults.distanceKm),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex?.id]);


  const last = useMemo(() => {
    if (!ex) return null;
    const e = p.entries
      .filter((x) => countsForRecords(x) && compareISO(x.date, p.date) < 0 && workingSets(x, ex.id).length > 0)
      .sort((a, b) => compareISO(b.date, a.date))[0];
    return e ? { date: e.date, text: summarizeSets(ex, workingSets(e, ex.id)) } : null;
  }, [ex, p.entries, p.date]);

  if (!ex) return <ExercisePicker onPick={setPicked} />;

  const values: QuickValues = {
    weightKg: parseNum(text.weightKg), count: parseNum(text.count), setCount: ex.type === 'cardio' ? 1 : (parseNum(text.setCount) ?? 0),
    durationMin: parseNum(text.durationMin), distanceKm: parseNum(text.distanceKm),
  };
  // 비어 있지 않은 칸이 숫자가 아니거나, 횟수·초가 정수가 아니면 추가할 수 없다
  const fields: Field[] = ex.type === 'cardio' ? ['durationMin', 'distanceKm'] : ['weightKg', 'count'];
  const parsable = fields.every((f) => text[f].trim() === '' || parseNum(text[f]) !== undefined);
  const wholeCount = values.count === undefined || Number.isInteger(values.count);
  const valid = parsable && wholeCount && (ex.type === 'cardio' || isValidSetCount(parseNum(text.setCount)));
  const input = (f: Field, label: string, unit: string, width = '3.6em') => (
    <label className="field">
      <input aria-label={label} placeholder={label.replace(/\(.*\)/, '')} inputMode="decimal" value={text[f]} style={{ width }}
        onChange={(e) => setText((t) => ({ ...t, [f]: e.target.value }))} />
      <span className="unit">{unit}</span>
    </label>
  );
  const toggleMeasure = async () => {
    const next = measure === 'seconds' ? 'reps' : 'seconds';
    try {
      const changed = await repo.changeMeasure(ex.id, next);
      // 횟수/시간 칸만 새 단위의 지난 값으로 다시 채운다 (입력한 무게·세트 수는 유지)
      const count = quickDefaults({ ...ex, measure: next }, p.entries, p.date).count;
      setText((t) => ({ ...t, count: toText(count) }));
      const r = DEFAULT_RANGE[next];
      setNotice(changed > 0
        ? { tone: 'info', text: `루틴 ${changed}개의 목표 범위를 ${r.min}~${r.max}${unitLabel(next)}로 바꿨어요. 루틴 화면에서 고칠 수 있어요.` }
        : null);
    } catch {
      setNotice({ tone: 'error', text: '단위를 바꾸지 못했어요. 다시 눌러 주세요.' });
    }
  };

  return (
    <fieldset className="panel quick-add" role="group" aria-label={`${ex.name} 추가`}>
      <div className="row">
        <strong>{ex.name}</strong>
        <button className="icon" aria-label="다른 운동 고르기" onClick={() => setPicked(null)}>✕</button>
      </div>
      <div className="row">
        {ex.type === 'cardio' ? (<>
          {input('durationMin', '시간(분)', '분')}
          {input('distanceKm', '거리(km)', 'km')}
        </>) : (<>
          {input('weightKg', ex.type === 'weight' ? '무게' : '추가 무게', ex.type === 'weight' ? 'kg' : '+kg')}
          {input('count', measure === 'seconds' ? '시간(초)' : '횟수', '', '3.2em')}
          <button className="chip unit-toggle" aria-label="단위 바꾸기" title="횟수 ↔ 시간(초)" onClick={() => void toggleMeasure()}>{unitLabel(measure)}</button>
          {input('setCount', '세트 수', '세트', '2.6em')}
        </>)}
        <button className="primary small-btn" disabled={!valid} onClick={() => { p.onAdd(ex, buildQuickSets(ex, values)); setPicked(null); }}>추가</button>
      </div>
      {notice && <p className={notice.tone === 'error' ? 'error' : 'hint'} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      {last && <p className="hint">지난번: {last.text} ({last.date.slice(5).replace('-', '/')})</p>}
    </fieldset>
  );
}
