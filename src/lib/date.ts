// 날짜 라이브러리는 이 파일에서만 쓴다. Safari가 Temporal을 정식 지원하면 이 파일만 바꾸면 된다.
import {
  format, parse, addDays as dfAddDays, addMonths, differenceInCalendarDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
} from 'date-fns';
import { ko } from 'date-fns/locale';
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

export function startOfMonthISO(d: ISODate): ISODate {
  return format(startOfMonth(toDate(d)), FMT);
}

export function addMonthsISO(d: ISODate, n: number): ISODate {
  return format(addMonths(toDate(d), n), FMT);
}

/** 달력 칸: 일요일 시작, 앞뒤 달 날짜로 주를 채운다 */
export function monthGrid(month: ISODate): { date: ISODate; inMonth: boolean }[] {
  const m = startOfMonth(toDate(month));
  return eachDayOfInterval({ start: startOfWeek(m), end: endOfWeek(endOfMonth(m)) })
    .map((d) => ({ date: format(d, FMT), inMonth: isSameMonth(d, m) }));
}

export const monthTitle = (d: ISODate) => format(toDate(d), 'yyyy년 M월');
export const dayTitle = (d: ISODate) => format(toDate(d), 'M월 d일 (E)', { locale: ko });
export const dayLabel = (d: ISODate) => format(toDate(d), 'M월 d일');
export const formatDateTime = (ms: number) => format(ms, 'yyyy-MM-dd HH:mm');
