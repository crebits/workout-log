import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import * as files from '../../src/platform/files';
import * as install from '../../src/platform/install';
import { SettingsScreen } from '../../src/ui/settings/SettingsScreen';
import { InstallGuide } from '../../src/ui/InstallGuide';

beforeEach(async () => { await db.delete(); await db.open(); vi.restoreAllMocks(); });

test('디로드 주기 변경이 저장된다', async () => {
  render(<SettingsScreen />);
  fireEvent.change(await screen.findByLabelText('디로드 주기(바퀴)'), { target: { value: '5' } });
  await waitFor(async () => expect((await repo.getSettings()).deloadEveryLaps).toBe(5));
});

test('목표 횟수 기본값은 비울 수 있다', async () => {
  await repo.saveSettings({ defaultTargetRange: { min: 6, max: 8 } });
  render(<SettingsScreen />);
  fireEvent.change(await screen.findByLabelText('기본 목표 최소'), { target: { value: '' } });
  await waitFor(async () => expect((await repo.getSettings()).defaultTargetRange).toBeNull());
});

test('내보내기 성공 시 lastBackupAt 갱신', async () => {
  vi.spyOn(files, 'shareOrDownload').mockResolvedValue('shared');
  render(<SettingsScreen />);
  fireEvent.click(await screen.findByRole('button', { name: '백업 내보내기' }));
  await waitFor(async () => expect((await repo.getSettings()).lastBackupAt).not.toBeNull());
  expect(files.shareOrDownload).toHaveBeenCalledWith(expect.stringMatching(/^workout-log-\d{4}-\d{2}-\d{2}\.json$/), expect.any(String));
});

test('내보내기 취소면 lastBackupAt 그대로', async () => {
  vi.spyOn(files, 'shareOrDownload').mockResolvedValue('cancelled');
  render(<SettingsScreen />);
  fireEvent.click(await screen.findByRole('button', { name: '백업 내보내기' }));
  await new Promise((r) => setTimeout(r, 50));
  expect((await repo.getSettings()).lastBackupAt).toBeNull();
});

test('가져오기: 겹치는 날짜가 있으면 선택지가 보이고 적용된다', async () => {
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: 'mine', exercises: [] });
  const backup = { schemaVersion: 1, exportedAt: 1, exercises: [], routines: [], settings: {},
    entries: [{ id: 'x', createdAt: 1, updatedAt: 1, date: '2026-11-01', routineId: null, isDeload: false, memo: 'theirs', exercises: [] },
      { id: 'y', createdAt: 1, updatedAt: 1, date: '2026-11-02', routineId: null, isDeload: false, memo: 'new', exercises: [] }] };
  vi.spyOn(files, 'readFile').mockResolvedValue(JSON.stringify(backup));
  render(<SettingsScreen />);
  const input = await screen.findByLabelText('백업 파일 선택');
  fireEvent.change(input, { target: { files: [new File(['x'], 'b.json')] } });
  expect(await screen.findByText('새로 추가 1일, 겹치는 날짜 1일')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '백업으로 바꾸기' }));
  fireEvent.click(screen.getByRole('button', { name: '가져오기 실행' }));
  await waitFor(async () => expect((await repo.getEntry('2026-11-01'))?.memo).toBe('theirs'));
  expect((await repo.getEntry('2026-11-02'))?.memo).toBe('new');
});

test('잘못된 파일은 안내', async () => {
  vi.spyOn(files, 'readFile').mockResolvedValue('nope');
  render(<SettingsScreen />);
  fireEvent.change(await screen.findByLabelText('백업 파일 선택'), { target: { files: [new File(['x'], 'b.json')] } });
  expect(await screen.findByText('백업 파일을 읽을 수 없습니다')).toBeInTheDocument();
});

test('standalone이면 설치 안내가 안 보인다', () => {
  vi.spyOn(install, 'isStandalone').mockReturnValue(true);
  vi.spyOn(install, 'isIOS').mockReturnValue(true);
  render(<InstallGuide />);
  expect(screen.queryByRole('note')).toBeNull();
});

test('iOS Safari면 설치 안내가 보이고 닫을 수 있다', () => {
  vi.spyOn(install, 'isStandalone').mockReturnValue(false);
  vi.spyOn(install, 'isIOS').mockReturnValue(true);
  render(<InstallGuide />);
  expect(screen.getByRole('note')).toHaveTextContent('홈 화면에 추가');
  fireEvent.click(screen.getByRole('button', { name: '안내 닫기' }));
  expect(screen.queryByRole('note')).toBeNull();
});
