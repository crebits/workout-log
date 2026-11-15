import type { Routine } from '../types';

export const INTENSITY_LABEL: Record<'heavy' | 'light', string> = { heavy: '고중량', light: '저중량' };

/** 화면에 보이는 루틴 이름. 같은 이름(예: 하체)도 강도로 구분되게 뒤에 붙인다 */
export function routineTitle(r: Pick<Routine, 'name' | 'intensity'>): string {
  if (!r.intensity) return r.name;
  const label = INTENSITY_LABEL[r.intensity];
  return r.name.includes(label) ? r.name : `${r.name} ${label}`;
}
