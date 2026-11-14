/** 한 번에 하나만 펼치는 운동 목록에서, 순서가 바뀌거나 운동이 빠졌을 때 펼친 위치를 맞춘다. */
export type Open = number | null;

export function afterMove(open: Open, from: number, to: number): Open {
  if (open === null) return null;
  if (open === from) return to;
  if (from < open && open <= to) return open - 1;
  if (to <= open && open < from) return open + 1;
  return open;
}

export function afterRemove(open: Open, removed: number): Open {
  if (open === null || open === removed) return null;
  return open > removed ? open - 1 : open;
}
