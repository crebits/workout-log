import type { Entry, Exercise, ISODate } from '../types';
import { compareISO } from '../lib/date';

const CONTEXT = 20;

function snippetAround(text: string, at: number, len: number): string {
  const start = Math.max(0, at - CONTEXT);
  const end = Math.min(text.length, at + len + CONTEXT);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

/** 운동 이름(삭제된 운동 포함)과 메모에서 찾는다. 날짜 내림차순. */
export function searchEntries(q: string, entries: Entry[], exercises: Map<string, Exercise>): { date: ISODate; snippet: string }[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const out: { date: ISODate; snippet: string }[] = [];
  for (const e of entries) {
    if (e.deletedAt) continue;
    const exName = e.exercises.map((b) => exercises.get(b.exerciseId)?.name ?? '').find((n) => n.toLowerCase().includes(query));
    if (exName) { out.push({ date: e.date, snippet: exName }); continue; }
    const at = e.memo.toLowerCase().indexOf(query);
    if (at >= 0) out.push({ date: e.date, snippet: snippetAround(e.memo, at, query.length) });
  }
  return out.sort((a, b) => compareISO(b.date, a.date));
}
