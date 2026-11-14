import { format, parse, addDays as dfAddDays, differenceInCalendarDays } from 'date-fns';
import type { ISODate } from '../types';

const FMT = 'yyyy-MM-dd';
const toDate = (d: ISODate) => parse(d, FMT, new Date(2000, 0, 1));

/** 기기 현지 시간 기준 오늘. toISOString()은 UTC라 쓰지 않는다. */
export function todayISO(now: Date = new Date()): ISODate {
  return format(now, FMT);
}

export function addDays(d: ISODate, n: number): ISODate {
  return format(dfAddDays(toDate(d), n), FMT);
}

/** b − a (일) */
export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(toDate(b), toDate(a));
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function toLocalDate(d: ISODate): Date {
  return toDate(d);
}
