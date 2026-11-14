import { render, screen, fireEvent } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { RecordsScreen } from '../../src/ui/records/RecordsScreen';

beforeEach(async () => { await db.delete(); await db.open(); });

test('무게 운동 카드에 최고 무게(횟수)와 최고 e1RM', async () => {
  const b = await repo.saveExercise({ name: '벤치프레스', type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: '', exercises: [{ exerciseId: b.id, order: 0, sets: [{ isWarmup: false, weightKg: 80, reps: 8 }] }] });
  render(<RecordsScreen onOpenDate={() => {}} />);
  expect(await screen.findByText('80kg × 8회')).toBeInTheDocument();
  expect(screen.getByText('101.3kg')).toBeInTheDocument();
});

test('유산소 카드에 최고 페이스', async () => {
  const r = await repo.saveExercise({ name: '러닝', type: 'cardio', incrementKg: 0, primaryMuscles: [], secondaryMuscles: [], note: '' });
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: '', exercises: [{ exerciseId: r.id, order: 0, sets: [{ isWarmup: false, durationSec: 1920, distanceKm: 5.2 }] }] });
  render(<RecordsScreen onOpenDate={() => {}} />);
  expect(await screen.findByText('6\'09"/km')).toBeInTheDocument();
});

test('상세 목록: 루틴·강도·디로드 표시, 누르면 날짜 열기', async () => {
  const b = await repo.saveExercise({ name: '벤치프레스', type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });
  const rt = await repo.saveRoutine({ name: '가슴 저중량', kind: 'workout', intensity: 'light', order: 0, items: [] });
  await repo.saveEntry({ date: '2026-11-01', routineId: rt.id, isDeload: true, memo: '', exercises: [{ exerciseId: b.id, order: 0, sets: [{ isWarmup: false, weightKg: 60, reps: 10 }] }] });
  const onOpen = vi.fn();
  render(<RecordsScreen onOpenDate={onOpen} />);
  fireEvent.click(await screen.findByRole('button', { name: /벤치프레스/ }));
  const row = await screen.findByRole('button', { name: /11\/01/ });
  expect(row).toHaveTextContent('가슴 저중량');
  expect(row).toHaveTextContent('저중량');
  expect(row).toHaveTextContent('디로드');
  fireEvent.click(row);
  expect(onOpen).toHaveBeenCalledWith('2026-11-01');
});

test('기록이 없으면 안내', async () => {
  render(<RecordsScreen onOpenDate={() => {}} />);
  expect(await screen.findByText(/아직 기록이 없어요/)).toBeInTheDocument();
});

test('최고 무게에 횟수가 없으면 "× n" 없이', async () => {
  const c = await repo.saveExercise({ name: '파머스', type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '', measure: 'seconds' });
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: '', exercises: [{ exerciseId: c.id, order: 0, sets: [{ isWarmup: false, weightKg: 100, reps: 5 }] }] });
  render(<RecordsScreen onOpenDate={() => {}} />);
  expect(await screen.findByText('100kg')).toBeInTheDocument();
});
