import { render, screen, fireEvent } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { EntryModal } from '../../src/ui/entry/EntryModal';

test('루틴을 직접 골라도 지난 기록의 무게·횟수가 채워진다 (두 번째 운동 포함)', async () => {
  await db.delete(); await db.open();
  const mk = (name: string) => repo.saveExercise({ name, type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });
  const bench = await mk('벤치프레스'); const fly = await mk('플라이');
  const chest = await repo.saveRoutine({ name: '가슴', kind: 'workout', intensity: 'heavy', order: 0,
    items: [{ exerciseId: bench.id, order: 0, targetRepsMin: 6, targetRepsMax: 8 }, { exerciseId: fly.id, order: 1, targetRepsMin: 10, targetRepsMax: 12 }] });
  await repo.saveRoutine({ name: '등', kind: 'workout', intensity: 'heavy', order: 1, items: [] });
  await repo.saveEntry({ date: '2026-11-10', routineId: chest.id, isDeload: false, memo: '', exercises: [
    { exerciseId: bench.id, order: 0, sets: [{ isWarmup: false, weightKg: 80, reps: 7 }] },
    { exerciseId: fly.id, order: 1, sets: [{ isWarmup: false, weightKg: 14, reps: 11 }] },
  ] });
  render(<EntryModal date="2026-11-12" onClose={() => {}} />);
  const sel = await screen.findByLabelText('루틴');
  // 다음 차례는 '등' → '가슴'으로 바꿈
  fireEvent.change(sel, { target: { value: chest.id } });
  expect(await screen.findByLabelText('1세트 무게')).toHaveValue('80');
  expect(screen.getByRole('button', { name: /플라이 펼치기/ })).toHaveTextContent('14kg × 11');
});
