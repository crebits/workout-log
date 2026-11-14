export const SCHEMA_VERSION = 1;

/** 'YYYY-MM-DD', 기기 현지 시간 기준 */
export type ISODate = string;

export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export type ExerciseType = 'weight' | 'bodyweight' | 'cardio';

export const MUSCLES = ['가슴', '등', '어깨', '이두', '삼두', '하체', '복근', '전완'] as const;

export interface Exercise extends BaseRecord {
  name: string;
  type: ExerciseType;
  incrementKg: number;
  /** 무게·맨몸 운동을 횟수로 셀지 시간(초)으로 셀지. 없으면 횟수 */
  measure?: 'reps' | 'seconds';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  note: string;
}

export interface RoutineItem {
  exerciseId: string;
  order: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface Routine extends BaseRecord {
  name: string;
  kind: 'workout' | 'rest';
  intensity: 'heavy' | 'light' | null;
  order: number;
  items: RoutineItem[];
}

export interface WorkoutSet {
  isWarmup: boolean;
  weightKg?: number;
  reps?: number;
  addedWeightKg?: number;
  durationSec?: number;
  distanceKm?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
}

export interface EntryExercise {
  exerciseId: string;
  order: number;
  sets: WorkoutSet[];
}

export interface Entry extends BaseRecord {
  date: ISODate;
  routineId: string | null;
  isDeload: boolean;
  memo: string;
  exercises: EntryExercise[];
}

export interface Settings {
  id: 'settings';
  updatedAt: number;
  defaultTargetRange: { min: number; max: number } | null;
  backupReminderDays: number;
  deloadEveryLaps: number;
  deloadSetRatio: number;
  deloadWeightReduction: number;
  showLightRatio: boolean;
  lastBackupAt: number | null;
}

export const DEFAULT_INCREMENT_KG = 2.5;

export const DEFAULT_SETTINGS: Omit<Settings, 'updatedAt'> = {
  id: 'settings',
  defaultTargetRange: null,
  backupReminderDays: 14,
  deloadEveryLaps: 4,
  deloadSetRatio: 0.5,
  deloadWeightReduction: 0,
  showLightRatio: true,
  lastBackupAt: null,
};
