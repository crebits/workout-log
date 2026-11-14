import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { live, repo, type EntryDraft } from '../../data/repo';
import { computeStatus, type AppStatus } from '../../workout/status';
import { buildPrefill, type ExerciseHint } from '../../workout/prefill';
import { newPRs, type PRKey } from '../../workout/records';
import type { Entry, Exercise, ISODate, Routine, Settings } from '../../types';

const SAVE_DELAY_MS = 300;

export interface EntryDraftState {
  ready: boolean;
  draft: EntryDraft;
  /** 저장된(또는 저장 대기 중인) 일지인지. false면 미리 채운 상태로 아직 저장 안 함 */
  dirty: boolean;
  status: AppStatus | null;
  routines: Routine[];
  exercises: Map<string, Exercise>;
  entries: Entry[];
  settings: Settings | null;
  hints: Record<string, ExerciseHint>;
  trophies: Record<string, PRKey[]>;
  update(fn: (d: EntryDraft) => EntryDraft, opts?: { touchesSets?: boolean }): void;
  selectRoutine(id: string | null): void;
  setDeload(on: boolean): void;
  confirmAsIs(): void;
  flush(): Promise<void>;
}

export function useEntryDraft(date: ISODate): EntryDraftState {
  const routinesQ = live.routines();
  const exercisesQ = live.exercises({ includeDeleted: true });
  const entriesQ = live.entries();
  const settingsQ = live.settings();
  const loaded = routinesQ !== undefined && exercisesQ !== undefined && entriesQ !== undefined && settingsQ !== undefined;

  const exercises = useMemo(() => new Map((exercisesQ ?? []).map((e) => [e.id, e])), [exercisesQ]);
  const [draft, setDraft] = useState<EntryDraft>({ date, routineId: null, isDeload: false, memo: '', exercises: [] });
  const [dirty, setDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const setsTouched = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  const status = useMemo(
    () => (loaded ? computeStatus(routinesQ!, entriesQ!, date, settingsQ!) : null),
    [loaded, routinesQ, entriesQ, date, settingsQ],
  );

  const prefillFor = useCallback(
    (routineId: string | null, deload: boolean) => {
      const routine = routinesQ?.find((r) => r.id === routineId);
      if (!routine || routine.kind === 'rest' || !settingsQ || !entriesQ) return { exercises: [], hints: {} };
      return buildPrefill({ routine, exercises, entries: entriesQ, date, deload, settings: settingsQ });
    },
    [routinesQ, settingsQ, entriesQ, exercises, date],
  );

  // 처음 한 번: 저장된 일지가 있으면 그것, 없으면 다음 차례 루틴으로 미리 채움
  useEffect(() => {
    if (!loaded || initialized) return;
    const existing = entriesQ!.find((e) => e.date === date);
    if (existing) {
      setDraft({ date, routineId: existing.routineId, isDeload: existing.isDeload, memo: existing.memo, exercises: existing.exercises });
      setDirty(true);
      setsTouched.current = true;
    } else {
      const routineId = status!.nextRoutineId;
      const deload = status!.deload.active;
      setDraft({ date, routineId, isDeload: deload, memo: '', exercises: prefillFor(routineId, deload).exercises });
    }
    setInitialized(true);
  }, [loaded, initialized, entriesQ, date, status, prefillFor]);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!pending.current) return;
    pending.current = false;
    await repo.saveEntry(draftRef.current);
  }, []);

  const scheduleSave = useCallback(() => {
    pending.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, SAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); void flush(); };
  }, [flush]);

  const update: EntryDraftState['update'] = useCallback((fn, opts) => {
    setDraft((d) => { const next = fn(d); draftRef.current = next; return next; });
    if (opts?.touchesSets !== false) setsTouched.current = true;
    setDirty(true);
    scheduleSave();
  }, [scheduleSave]);

  const selectRoutine = useCallback((id: string | null) => {
    if (setsTouched.current && draftRef.current.exercises.length > 0 &&
      !window.confirm('루틴을 바꾸면 지금 적은 운동이 지난 기록으로 바뀝니다. 바꿀까요?')) return;
    const next = { ...draftRef.current, routineId: id, exercises: prefillFor(id, draftRef.current.isDeload).exercises };
    setsTouched.current = false;
    setDraft(next);
    draftRef.current = next;
    if (dirty) scheduleSave();
  }, [prefillFor, dirty, scheduleSave]);

  const setDeload = useCallback((on: boolean) => {
    const d = draftRef.current;
    const next = { ...d, isDeload: on, exercises: setsTouched.current ? d.exercises : prefillFor(d.routineId, on).exercises };
    setDraft(next);
    draftRef.current = next;
    setDirty(true);
    scheduleSave();
  }, [prefillFor, scheduleSave]);

  const confirmAsIs = useCallback(() => {
    setDirty(true);
    pending.current = true;
    void flush();
  }, [flush]);

  const hints = useMemo(() => prefillFor(draft.routineId, false).hints, [prefillFor, draft.routineId]);

  const trophies = useMemo(() => {
    const out: Record<string, PRKey[]> = {};
    if (!dirty || !entriesQ) return out;
    const asEntry: Entry = { ...draft, id: '__draft__', createdAt: 0, updatedAt: 0 };
    for (const b of draft.exercises) {
      const ex = exercises.get(b.exerciseId);
      if (!ex) continue;
      const keys = newPRs(ex, asEntry, entriesQ);
      if (keys.length) out[b.exerciseId] = keys;
    }
    return out;
  }, [dirty, draft, exercises, entriesQ]);

  return {
    ready: loaded && initialized, draft, dirty, status, routines: routinesQ ?? [], exercises, entries: entriesQ ?? [],
    settings: settingsQ ?? null, hints, trophies, update, selectRoutine, setDeload, confirmAsIs, flush,
  };
}
