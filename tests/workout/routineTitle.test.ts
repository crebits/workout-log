import { routineTitle } from '../../src/workout/routineTitle';

test('강도가 있으면 이름 뒤에 붙인다', () => {
  expect(routineTitle({ name: '가슴', intensity: 'heavy' })).toBe('가슴 고중량');
  expect(routineTitle({ name: '가슴', intensity: 'light' })).toBe('가슴 저중량');
});
test('강도가 없으면 이름만', () => expect(routineTitle({ name: '휴식', intensity: null })).toBe('휴식'));
test('이름에 이미 강도가 들어 있으면 두 번 붙이지 않는다', () => {
  expect(routineTitle({ name: '가슴·삼두 고중량', intensity: 'heavy' })).toBe('가슴·삼두 고중량');
});
