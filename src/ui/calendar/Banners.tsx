import type { AppStatus } from '../../workout/status';
import type { Routine, Settings } from '../../types';
import { routineTitle } from '../../workout/routineTitle';

export function Banners(p: {
  status: AppStatus;
  routines: Routine[];
  todayLogged: boolean;
  settings: Settings;
  hasEntries: boolean;
  today: Date;
}) {
  const next = p.routines.find((r) => r.id === p.status.nextRoutineId);
  const lines: { key: string; text: string; tone: 'info' | 'warn' }[] = [];

  if (next) {
    const when = p.todayLogged ? '내일' : '다음';
    lines.push({ key: 'next', tone: 'info', text: next.kind === 'rest' ? `${p.todayLogged ? '내일은' : '오늘은'} 휴식 차례` : `${when}: ${routineTitle(next)}` });
  }
  if (p.status.deload.active) {
    lines.push({ key: 'deload', tone: 'info', text: '디로드 진행 중' });
  } else if (p.status.deload.due) {
    lines.push({ key: 'deload', tone: 'warn', text: `디로드 차례예요 (${p.status.deload.lapsSinceDeload}바퀴 지남)` });
  } else if (p.status.stallSignal) {
    lines.push({ key: 'stall', tone: 'warn', text: `정체된 운동이 ${p.status.stalledCount}개 있어요. 조금 일찍 디로드해도 좋겠어요` });
  }
  const { lastBackupAt, backupReminderDays } = p.settings;
  if (lastBackupAt === null) {
    if (p.hasEntries) lines.push({ key: 'backup', tone: 'warn', text: '아직 백업한 적이 없어요. 설정에서 백업해 두세요' });
  } else {
    const days = Math.floor((p.today.getTime() - lastBackupAt) / 86_400_000);
    if (days >= backupReminderDays) lines.push({ key: 'backup', tone: 'warn', text: `마지막 백업 후 ${days}일 지났어요` });
  }
  if (lines.length === 0) return null;
  return (
    <div className="banners">
      {lines.map((l) => <div key={l.key} className={`banner ${l.tone}`}>{l.text}</div>)}
    </div>
  );
}
