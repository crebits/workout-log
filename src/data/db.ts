import Dexie, { type EntityTable } from 'dexie';
import type { Entry, Exercise, Routine, Settings } from '../types';
import { SCHEMA_VERSION } from '../types';

interface Meta { key: string; value: unknown }

export class WorkoutDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor() {
    super('workout-log');
    this.version(1).stores({
      exercises: 'id, name',
      routines: 'id, order',
      entries: 'id, &date, routineId',
      settings: 'id',
      meta: 'key',
    });
    this.on('populate', (tx) => {
      tx.table('meta').add({ key: 'schemaVersion', value: SCHEMA_VERSION });
    });
  }
}

export const db = new WorkoutDB();
