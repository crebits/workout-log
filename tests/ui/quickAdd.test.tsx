import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { EntryModal } from '../../src/ui/entry/EntryModal';
import { RecordsScreen } from '../../src/ui/records/RecordsScreen';
import type { Exercise } from '../../src/types';

let bench: Exercise; let plank: Exercise;
const mk = (p: Partial<Exercise> & { name: string }) =>
  repo.saveExercise({ type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '', ...p });

beforeEach(async () => {
  await db.delete(); await db.open();
  bench = await mk({ name: '벤치프레스' });
  await mk({ name: '러닝', type: 'cardio' });
  plank = await mk({ name: '플랭크', type: 'bodyweight' });
  await repo.saveEntry({ date: '2026-11-10', routineId: null, isDeload: false, memo: '',
    exercises: [{ exerciseId: bench.id, order: 0, sets: [80, 80, 80].map((wt) => ({ isWarmup: false, weightKg: wt, reps: 8 })) }] });
});

async function pick(name: string) {
  render(<EntryModal date="2026-11-20" onClose={() => {}} />);
  const input = await screen.findByLabelText('운동 추가');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(await screen.findByRole('option', { name }));
  return screen.findByRole('group', { name: `${name} 추가` });
}
const saved = async () => (await repo.getEntry('2026-11-20'))?.exercises ?? [];

test('운동을 고르면 지난번 값이 채워지고 추가하면 세트 3개가 생긴다', async () => {
  const g = await pick('벤치프레스');
  expect(within(g).getByLabelText('무게')).toHaveValue('80');
  expect(within(g).getByLabelText('횟수')).toHaveValue('8');
  expect(within(g).getByLabelText('세트 수')).toHaveValue('3');
  fireEvent.change(within(g).getByLabelText('무게'), { target: { value: '82,5' } });
  fireEvent.click(within(g).getByRole('button', { name: '추가' }));
  await waitFor(async () => expect((await saved())[0]?.sets).toEqual([82.5, 82.5, 82.5].map((wt) => ({ isWarmup: false, weightKg: wt, reps: 8 }))));
  expect(await screen.findByLabelText('운동 추가')).toBeInTheDocument();
});

test('세트 수 0·21·빈칸이면 추가 비활성', async () => {
  const g = await pick('벤치프레스');
  for (const v of ['0', '21', '', '2.5']) {
    fireEvent.change(within(g).getByLabelText('세트 수'), { target: { value: v } });
    expect(within(g).getByRole('button', { name: '추가' })).toBeDisabled();
  }
});

test('유산소는 세트 수 없이 1세트', async () => {
  const g = await pick('러닝');
  expect(within(g).queryByLabelText('세트 수')).toBeNull();
  fireEvent.change(within(g).getByLabelText('시간(분)'), { target: { value: '30' } });
  fireEvent.change(within(g).getByLabelText('거리(km)'), { target: { value: '5' } });
  fireEvent.click(within(g).getByRole('button', { name: '추가' }));
  await waitFor(async () => expect((await saved())[0]?.sets).toEqual([{ isWarmup: false, durationSec: 1800, distanceKm: 5 }]));
});

test('이미 있는 운동은 세트가 이어 붙는다', async () => {
  let g = await pick('벤치프레스');
  fireEvent.change(within(g).getByLabelText('세트 수'), { target: { value: '1' } });
  fireEvent.click(within(g).getByRole('button', { name: '추가' }));
  const input = await screen.findByLabelText('운동 추가');
  fireEvent.change(input, { target: { value: '벤치프레스' } });
  fireEvent.click(await screen.findByRole('option', { name: '벤치프레스' }));
  g = await screen.findByRole('group', { name: '벤치프레스 추가' });
  fireEvent.change(within(g).getByLabelText('세트 수'), { target: { value: '2' } });
  fireEvent.click(within(g).getByRole('button', { name: '추가' }));
  await waitFor(async () => {
    const ex = await saved();
    expect(ex).toHaveLength(1);
    expect(ex[0].sets).toHaveLength(3);
  });
});

test('단위 버튼으로 s로 바꾸면 운동에 저장되고 시간(초) 칸이 보인다', async () => {
  const g = await pick('플랭크');
  fireEvent.click(within(g).getByRole('button', { name: '단위 바꾸기' }));
  await waitFor(async () => expect((await repo.getExercise(plank.id))?.measure).toBe('seconds'));
  const g2 = await screen.findByRole('group', { name: '플랭크 추가' });
  fireEvent.change(await within(g2).findByLabelText('시간(초)'), { target: { value: '60' } });
  fireEvent.change(within(g2).getByLabelText('세트 수'), { target: { value: '2' } });
  fireEvent.click(within(g2).getByRole('button', { name: '추가' }));
  await waitFor(async () => expect((await saved())[0]?.sets).toEqual([{ isWarmup: false, durationSec: 60 }, { isWarmup: false, durationSec: 60 }]));
  expect(await screen.findByLabelText('1세트 시간(초)')).toHaveValue('60');
});

test('seconds 세트는 "60s"로 지난번 요약에 보인다', async () => {
  await repo.saveExercise({ ...plank, measure: 'seconds' });
  await repo.saveEntry({ date: '2026-11-12', routineId: null, isDeload: false, memo: '',
    exercises: [{ exerciseId: plank.id, order: 0, sets: [{ isWarmup: false, durationSec: 60 }, { isWarmup: false, durationSec: 45 }] }] });
  const g = await pick('플랭크');
  expect(within(g).getByText(/지난번: 60s,45s/)).toBeInTheDocument();
  expect(within(g).getByLabelText('시간(초)')).toHaveValue('45');
});

test('기록 화면: 최장 시간 60s', async () => {
  await repo.saveExercise({ ...plank, measure: 'seconds' });
  await repo.saveEntry({ date: '2026-11-12', routineId: null, isDeload: false, memo: '',
    exercises: [{ exerciseId: plank.id, order: 0, sets: [{ isWarmup: false, durationSec: 60 }] }] });
  render(<RecordsScreen onOpenDate={() => {}} />);
  expect(await screen.findByText('60s')).toBeInTheDocument();
  expect(screen.getByText('최장 시간')).toBeInTheDocument();
});
