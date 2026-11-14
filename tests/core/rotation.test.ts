import { walkRotation, type RotationItem, type RotationLog } from '../../src/core/rotation';

const ids = ['A1', 'B1', 'C1', 'R1', 'A2', 'B2', 'C2', 'R2'];
const items: RotationItem[] = ids.map((id) => ({ id, isRest: id.startsWith('R') }));
const log = (date: string, itemId: string): RotationLog => ({ date, itemId });

test('기록 없으면 첫 항목', () => {
  const w = walkRotation(items, [], '2026-11-15');
  expect(w.nextItemId).toBe('A1');
  expect(w.nextPos).toBe(0);
});

test('목록이 비면 null', () => expect(walkRotation([], [], '2026-11-15').nextItemId).toBeNull());

test('C1 다음날 기록 없이 지나면 휴식 간주 후 A2', () => {
  const w = walkRotation(items, [log('2026-11-12', 'C1')], '2026-11-14');
  expect(w.steps.filter((s) => s.inferred).map((s) => s.date)).toEqual(['2026-11-13']);
  expect(w.nextItemId).toBe('A2');
});

test('휴식 차례 당일(until)은 아직 간주하지 않는다', () => {
  const w = walkRotation(items, [log('2026-11-12', 'C1')], '2026-11-13');
  expect(w.steps.some((s) => s.inferred)).toBe(false);
  expect(w.nextItemId).toBe('R1');
});

test('운동 차례 날을 넘기면 그대로 머문다', () => {
  expect(walkRotation(items, [log('2026-11-10', 'A1')], '2026-11-15').nextItemId).toBe('B1');
});

test('until 당일·이후 로그는 무시 (지난 날짜 열기)', () => {
  const logs = [log('2026-11-10', 'A1'), log('2026-11-11', 'B1'), log('2026-11-12', 'C1')];
  expect(walkRotation(items, logs, '2026-11-11').nextItemId).toBe('B1');
});

test('로그 순서가 섞여 있어도 날짜순으로 계산', () => {
  const logs = [log('2026-11-11', 'B1'), log('2026-11-10', 'A1')];
  expect(walkRotation(items, logs, '2026-11-12').nextItemId).toBe('C1');
});

test('건너뛰기: A1 다음에 C1 기록 → 다음은 R1, pos 2칸', () => {
  const w = walkRotation(items, [log('2026-11-10', 'A1'), log('2026-11-11', 'C1')], '2026-11-12');
  expect(w.nextItemId).toBe('R1');
  expect(w.steps.at(-1)!.pos).toBe(2);
});

test('한 바퀴 돌면 pos가 목록 길이만큼 증가', () => {
  const logs = ['A1', 'B1', 'C1', 'R1', 'A2', 'B2', 'C2'].map((id, i) => log(`2026-11-0${i + 1}`, id));
  logs.push(log('2026-11-09', 'A1')); // 11-08은 R2 간주
  const w = walkRotation(items, logs, '2026-11-10');
  const last = w.steps.at(-1)!;
  expect(last.itemId).toBe('A1');
  expect(last.pos).toBe(8);
  expect(w.steps.find((s) => s.date === '2026-11-08')).toMatchObject({ itemId: 'R2', inferred: true, pos: 7 });
});

test('지운 루틴 id 로그는 무시', () => {
  const base = [log('2026-11-10', 'A1')];
  const a = walkRotation(items, base, '2026-11-12');
  const b = walkRotation(items, [...base, log('2026-11-11', 'gone')], '2026-11-12');
  expect(b).toEqual(a);
});

test('마지막 항목 다음은 첫 항목', () => {
  expect(walkRotation(items, [log('2026-11-10', 'R2')], '2026-11-11').nextItemId).toBe('A1');
});

test('nextPos는 마지막 스텝 pos + 1', () => {
  const w = walkRotation(items, [log('2026-11-10', 'A1'), log('2026-11-11', 'B1')], '2026-11-12');
  expect(w.nextPos).toBe(2);
});
