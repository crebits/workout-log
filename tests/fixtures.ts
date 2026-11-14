import type { Entry, Exercise, Routine, Settings, WorkoutSet, EntryExercise } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';

let seq = 0;
const base = () => ({ id: `id${++seq}`, createdAt: 1, updatedAt: 1 });

export const ex = (p: Partial<Exercise> & { name: string }): Exercise => ({
  ...base(), type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '', ...p,
});
export const routine = (p: Partial<Routine> & { name: string }): Routine => ({
  ...base(), kind: 'workout', intensity: null, order: 0, items: [], ...p,
});
export const w = (weightKg: number, reps: number, isWarmup = false): WorkoutSet => ({ isWarmup, weightKg, reps });
export const block = (exerciseId: string, sets: WorkoutSet[], order = 0): EntryExercise => ({ exerciseId, order, sets });
export const entry = (date: string, p: Partial<Entry> = {}): Entry => ({
  ...base(), date, routineId: null, isDeload: false, memo: '', exercises: [], ...p,
});
export const settings = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, updatedAt: 1, ...p });
