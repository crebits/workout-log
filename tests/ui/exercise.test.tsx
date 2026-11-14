import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { ExercisePicker } from '../../src/ui/exercise/ExercisePicker';
import { ExerciseForm } from '../../src/ui/exercise/ExerciseForm';

beforeEach(async () => { await db.delete(); await db.open(); });
const mk = (name: string, type: 'weight' | 'cardio' = 'weight') =>
  repo.saveExercise({ name, type, incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });

test('"벤치" 입력 시 벤치프레스가 뜨고 고르면 onPick', async () => {
  const b = await mk('벤치프레스');
  await mk('스쿼트');
  const onPick = vi.fn();
  render(<ExercisePicker onPick={onPick} />);
  fireEvent.change(screen.getByLabelText('운동 추가'), { target: { value: '벤치' } });
  fireEvent.click(await screen.findByRole('option', { name: '벤치프레스' }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: b.id }));
  expect(screen.queryByRole('option', { name: '스쿼트' })).toBeNull();
});

test('최근 사용 순으로 정렬', async () => {
  const a = await mk('덤벨 프레스');
  const b = await mk('인클라인 덤벨');
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: '', exercises: [{ exerciseId: a.id, order: 0, sets: [] }] });
  await repo.saveEntry({ date: '2026-11-10', routineId: null, isDeload: false, memo: '', exercises: [{ exerciseId: b.id, order: 0, sets: [] }] });
  render(<ExercisePicker onPick={() => {}} />);
  fireEvent.change(screen.getByLabelText('운동 추가'), { target: { value: '덤벨' } });
  // 기록 목록이 늦게 로드될 수 있으므로 정렬이 맞춰질 때까지 기다린다
  await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent).slice(0, 2)).toEqual(['인클라인 덤벨', '덤벨 프레스']));
});

test('삭제된 운동은 뜨지 않는다', async () => {
  const a = await mk('풀업');
  await repo.deleteExercise(a.id);
  render(<ExercisePicker onPick={() => {}} />);
  fireEvent.change(screen.getByLabelText('운동 추가'), { target: { value: '풀업' } });
  expect(await screen.findByRole('option', { name: '새 운동: 풀업' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: '풀업' })).toBeNull();
});

test('없는 이름 → 새 운동 폼 → 저장하면 onPick', async () => {
  const onPick = vi.fn();
  render(<ExercisePicker onPick={onPick} />);
  fireEvent.change(screen.getByLabelText('운동 추가'), { target: { value: '러닝' } });
  fireEvent.click(await screen.findByRole('option', { name: '새 운동: 러닝' }));
  fireEvent.change(await screen.findByLabelText('종류'), { target: { value: 'cardio' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: '러닝', type: 'cardio' })));
});

test('ExerciseForm: 증가 단위·부위·고정 메모 수정', async () => {
  const a = await mk('벤치프레스');
  const onSaved = vi.fn();
  render(<ExerciseForm initial={a} onSaved={onSaved} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('증가 단위(kg)'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: /부위/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: '주 부위 가슴' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '보조 부위 삼두' }));
  fireEvent.change(screen.getByLabelText('고정 메모'), { target: { value: '의자 4' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(async () => {
    const e = await repo.getExercise(a.id);
    expect(e).toMatchObject({ incrementKg: 2, primaryMuscles: ['가슴'], secondaryMuscles: ['삼두'], note: '의자 4' });
  });
});

test('ExerciseForm: 부위 칸은 접혀 있고, 접힌 채 저장해도 부위 값은 유지', async () => {
  const a = await repo.saveExercise({ name: '벤치프레스', type: 'weight', incrementKg: 2.5, primaryMuscles: ['가슴'], secondaryMuscles: ['삼두'], note: '' });
  render(<ExerciseForm initial={a} onSaved={() => {}} onCancel={() => {}} />);
  expect(screen.queryByRole('checkbox', { name: '주 부위 가슴' })).toBeNull();
  expect(screen.getByRole('button', { name: /부위/ })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.change(screen.getByLabelText('고정 메모'), { target: { value: '의자 4' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(async () => expect(await repo.getExercise(a.id)).toMatchObject({ primaryMuscles: ['가슴'], secondaryMuscles: ['삼두'], note: '의자 4' }));
});

test('ExerciseForm: 같은 이름 운동이 이미 있으면 저장 안 함', async () => {
  await mk('벤치프레스');
  render(<ExerciseForm initialName="벤치프레스" onSaved={() => {}} onCancel={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByText('같은 이름의 운동이 이미 있어요')).toBeInTheDocument();
});

test('ExerciseForm: 운동 삭제', async () => {
  const a = await mk('벤치프레스');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const onSaved = vi.fn();
  render(<ExerciseForm initial={a} onSaved={onSaved} onCancel={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '운동 삭제' }));
  await waitFor(async () => expect((await repo.getExercise(a.id))?.deletedAt).toBeDefined());
});

test('Enter는 정확히 같은 이름만 고르고, 일부만 같으면 새 운동 폼', async () => {
  await mk('벤치프레스');
  const onPick = vi.fn();
  render(<ExercisePicker onPick={onPick} />);
  const input = screen.getByLabelText('운동 추가');
  fireEvent.change(input, { target: { value: '프레스' } });
  await screen.findByRole('option', { name: '벤치프레스' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(await screen.findByRole('group', { name: '운동 정보' })).toBeInTheDocument();
  expect(onPick).not.toHaveBeenCalled();
});
