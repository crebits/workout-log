import { afterMove, afterRemove } from '../../src/ui/entry/accordion';

test('펼친 운동을 옮기면 따라간다', () => {
  expect(afterMove(0, 0, 2)).toBe(2);
  expect(afterMove(2, 2, 0)).toBe(0);
});
test('다른 운동을 옮기면 펼친 위치가 밀린다', () => {
  expect(afterMove(1, 0, 2)).toBe(0);   // 앞의 것이 뒤로 가면 한 칸 앞으로
  expect(afterMove(1, 2, 0)).toBe(2);   // 뒤의 것이 앞으로 오면 한 칸 뒤로
  expect(afterMove(3, 0, 1)).toBe(3);
  expect(afterMove(null, 0, 1)).toBeNull();
});
test('펼친 운동을 빼면 모두 접히고, 앞의 것을 빼면 한 칸 당겨진다', () => {
  expect(afterRemove(1, 1)).toBeNull();
  expect(afterRemove(2, 0)).toBe(1);
  expect(afterRemove(0, 2)).toBe(0);
  expect(afterRemove(null, 0)).toBeNull();
});
