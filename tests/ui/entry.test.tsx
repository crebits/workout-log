import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { EntryModal } from '../../src/ui/entry/EntryModal';
import type { Exercise, Routine } from '../../src/types';

let bench: Exercise; let heavy: Routine;

beforeEach(async () => {
  await db.delete(); await db.open();
  bench = await repo.saveExercise({ name: '벤치프레스', type: 'weight', incrementKg: 2.5, primaryMuscles: ['가슴'], secondaryMuscles: [], note: '의자 4' });
  await repo.saveExercise({ name: '러닝', type: 'cardio', incrementKg: 0, primaryMuscles: [], secondaryMuscles: [], note: '' });
  heavy = await repo.saveRoutine({ name: '가슴 고중량', kind: 'workout', intensity: 'heavy', order: 0,
    items: [{ exerciseId: bench.id, order: 0, targetRepsMin: 6, targetRepsMax: 8 }] });
  await repo.saveRoutine({ name: '휴식', kind: 'rest', intensity: null, order: 1, items: [] });
  await repo.saveEntry({ date: '2026-11-10', routineId: heavy.id, isDeload: false, memo: '',
    exercises: [{ exerciseId: bench.id, order: 0, sets: [{ isWarmup: true, weightKg: 40, reps: 10 }, { isWarmup: false, weightKg: 80, reps: 7 }] }] });
  // 11-11 휴식 기록 → 11-12의 다음 차례는 가슴 고중량
  await repo.saveEntry({ date: '2026-11-11', routineId: (await repo.listRoutines())[1].id, isDeload: false, memo: '', exercises: [] });
});

const open = (date = '2026-11-12') => render(<EntryModal date={date} onClose={() => {}} />);
const settle = () => new Promise((r) => setTimeout(r, 400));

test('새 날짜를 열면 다음 루틴이 선택되고 지난 값이 채워지지만 저장되지 않는다', async () => {
  open();
  expect(await screen.findByLabelText('루틴')).toHaveValue(heavy.id);
  expect(await screen.findByLabelText('1세트 무게')).toHaveValue('80');
  expect(screen.getByText(/지난번: 80kg × 7/)).toBeInTheDocument();
  expect(screen.getByText('📌 의자 4')).toBeInTheDocument();
  await settle();
  expect(await repo.getEntry('2026-11-12')).toBeUndefined();
});

test('값을 고치면 자동 저장된다', async () => {
  open();
  fireEvent.change(await screen.findByLabelText('1세트 횟수'), { target: { value: '8' } });
  await waitFor(async () => expect((await repo.getEntry('2026-11-12'))?.exercises[0].sets[1].reps).toBe(8));
});

test('그대로 완료를 누르면 채운 값이 저장된다', async () => {
  open();
  fireEvent.click(await screen.findByRole('button', { name: '그대로 완료' }));
  await waitFor(async () => expect((await repo.getEntry('2026-11-12'))?.exercises[0].sets[1].weightKg).toBe(80));
  expect(screen.queryByRole('button', { name: '그대로 완료' })).toBeNull();
});

test('"62,5" 입력은 62.5로, 빈칸은 undefined로 저장', async () => {
  open();
  fireEvent.change(await screen.findByLabelText('1세트 무게'), { target: { value: '62,5' } });
  fireEvent.change(screen.getByLabelText('1세트 횟수'), { target: { value: '' } });
  await waitFor(async () => {
    const s = (await repo.getEntry('2026-11-12'))?.exercises[0].sets[1];
    expect(s?.weightKg).toBe(62.5);
    expect(s?.reps).toBeUndefined();
  });
});

test('+2.5kg 버튼은 그 운동의 증가 단위만큼', async () => {
  open();
  fireEvent.click(await screen.findByRole('button', { name: '1세트 +2.5kg' }));
  expect(screen.getByLabelText('1세트 무게')).toHaveValue('82.5');
});

test('워밍업 세트는 W로 보이고 본 세트 번호에서 빠진다', async () => {
  open();
  expect(await screen.findByRole('button', { name: '워밍업 세트 (누르면 본 세트로)' })).toHaveTextContent('W');
  expect(screen.getByLabelText('1세트 무게')).toHaveValue('80');
});

test('유산소 32분 5.2km → 6\'09"/km 표시', async () => {
  open('2026-11-20');
  fireEvent.change(await screen.findByLabelText('루틴'), { target: { value: '' } });
  const add = await screen.findByLabelText('운동 추가');
  fireEvent.change(add, { target: { value: '러닝' } });
  fireEvent.keyDown(add, { key: 'Enter' });
  fireEvent.change(await screen.findByLabelText('1세트 시간(분)'), { target: { value: '32' } });
  fireEvent.change(screen.getByLabelText('1세트 거리(km)'), { target: { value: '5.2' } });
  expect(await screen.findByText('6\'09"/km')).toBeInTheDocument();
});

test('루틴 등록: 현재 순서로 새 루틴 생성, 범위 7~9', async () => {
  open('2026-11-20');
  fireEvent.change(await screen.findByLabelText('루틴'), { target: { value: '' } });
  const add = await screen.findByLabelText('운동 추가');
  fireEvent.change(add, { target: { value: '벤치프레스' } });
  fireEvent.keyDown(add, { key: 'Enter' });
  fireEvent.change(await screen.findByLabelText('1세트 무게'), { target: { value: '80' } });
  fireEvent.change(screen.getByLabelText('1세트 횟수'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: '⭐ 루틴 등록' }));
  const panel = await screen.findByRole('group', { name: '루틴 등록' });
  fireEvent.change(within(panel).getByLabelText('새 루틴 이름'), { target: { value: '새 가슴' } });
  fireEvent.click(within(panel).getByRole('button', { name: '새 루틴으로 저장' }));
  await waitFor(async () => {
    const r = (await repo.listRoutines()).find((x) => x.name === '새 가슴');
    expect(r?.items).toEqual([{ exerciseId: bench.id, order: 0, targetRepsMin: 7, targetRepsMax: 9 }]);
  });
  await waitFor(async () => expect((await repo.getEntry('2026-11-20'))?.routineId).not.toBeNull());
});

test('이전 최고 무게를 넘겨 저장하면 🏆', async () => {
  open();
  fireEvent.change(await screen.findByLabelText('1세트 무게'), { target: { value: '85' } });
  expect(await screen.findByLabelText('신기록')).toBeInTheDocument();
});

test('위쪽을 채웠던 경우 무게 올릴 차례 표시', async () => {
  await repo.saveEntry({ date: '2026-11-12', routineId: heavy.id, isDeload: false, memo: '',
    exercises: [{ exerciseId: bench.id, order: 0, sets: [{ isWarmup: false, weightKg: 80, reps: 8 }] }] });
  open('2026-11-14');
  expect(await screen.findByText('⬆ 무게 올릴 차례')).toBeInTheDocument();
  expect(screen.getByLabelText('1세트 무게')).toHaveValue('82.5');
  expect(screen.getByLabelText('1세트 횟수')).toHaveValue('6');
});

test('메모만 써도 저장되고, 다 지우면 삭제된다', async () => {
  open('2026-11-20');
  fireEvent.change(await screen.findByLabelText('루틴'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '컨디션 좋음' } });
  await waitFor(async () => expect((await repo.getEntry('2026-11-20'))?.memo).toBe('컨디션 좋음'));
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '' } });
  await waitFor(async () => expect(await repo.getEntry('2026-11-20')).toBeUndefined());
});
