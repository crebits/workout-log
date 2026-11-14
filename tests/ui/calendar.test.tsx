import { render, screen, fireEvent } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { CalendarScreen } from '../../src/ui/calendar/CalendarScreen';

beforeEach(async () => { await db.delete(); await db.open(); });

async function seed() {
  const a = await repo.saveRoutine({ name: '가슴·삼두 고중량', kind: 'workout', intensity: 'heavy', order: 0, items: [] });
  const b = await repo.saveRoutine({ name: '등·이두 고중량', kind: 'workout', intensity: 'heavy', order: 1, items: [] });
  const r = await repo.saveRoutine({ name: '휴식', kind: 'rest', order: 2, intensity: null, items: [] });
  const c = await repo.saveRoutine({ name: '하체·어깨 고중량', kind: 'workout', intensity: 'heavy', order: 3, items: [] });
  return { a, b, r, c };
}
const save = (date: string, routineId: string | null, memo = '') => repo.saveEntry({ date, routineId, isDeload: false, memo, exercises: [] });

test('기록 있는 날짜에 루틴 이름이 보인다', async () => {
  const { a } = await seed();
  await save('2026-11-10', a.id);
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText('가슴·삼두 고중량', { selector: '.cell-label' })).toBeInTheDocument();
});

test('다음 차례 안내가 보인다', async () => {
  const { a, b } = await seed();
  await save('2026-11-12', a.id);
  await save('2026-11-13', b.id);
  // 11-14 휴식 간주 → 오늘(11-15) 하체·어깨
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText('다음: 하체·어깨 고중량')).toBeInTheDocument();
});

test('오늘 기록이 있으면 내일 차례를 안내', async () => {
  const { a } = await seed();
  await save('2026-11-15', a.id);
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText('내일: 등·이두 고중량')).toBeInTheDocument();
});

test('간주 휴식 날짜에 흐린 "휴식"이 보인다', async () => {
  const { a, b } = await seed();
  await save('2026-11-12', a.id);
  await save('2026-11-13', b.id);
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  const cell = await screen.findByRole('button', { name: /11월 14일/ });
  expect(await screen.findByText('휴식', { selector: '.cell-label.inferred' })).toBeInTheDocument();
  expect(cell.querySelector('.inferred')).not.toBeNull();
});

test('백업 14일 경과 시 백업 알림', async () => {
  await seed();
  await repo.saveSettings({ lastBackupAt: new Date(2026, 9, 31).getTime() });
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText(/마지막 백업 후 15일/)).toBeInTheDocument();
});

test('기록이 있는데 백업한 적 없으면 알림', async () => {
  await save('2026-11-10', null, '메모');
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText(/아직 백업한 적이 없어요/)).toBeInTheDocument();
});

test('날짜를 누르면 onOpenDate 호출', async () => {
  const onOpen = vi.fn();
  render(<CalendarScreen today="2026-11-15" onOpenDate={onOpen} />);
  fireEvent.click(await screen.findByRole('button', { name: /11월 3일/ }));
  expect(onOpen).toHaveBeenCalledWith('2026-11-03');
});

test('이전 달로 이동', async () => {
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: '이전 달' }));
  expect(await screen.findByText('2026년 10월')).toBeInTheDocument();
});

test('지운 루틴의 기록도 루틴 이름이 보인다', async () => {
  const { a, r } = await seed();
  await save('2026-11-10', a.id);
  await save('2026-11-11', r.id);
  await repo.deleteRoutine(a.id);
  await repo.deleteRoutine(r.id);
  render(<CalendarScreen today="2026-11-15" onOpenDate={() => {}} />);
  expect(await screen.findByText('가슴·삼두 고중량', { selector: '.cell-label' })).toBeInTheDocument();
  expect(screen.getByText('휴식', { selector: '.cell-label' })).toBeInTheDocument();
});
