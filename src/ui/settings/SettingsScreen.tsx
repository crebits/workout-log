import { useState } from 'react';
import { format } from 'date-fns';
import { live, repo } from '../../data/repo';
import { buildBackup, parseBackup, planImport, type ImportPlan } from '../../data/backup';
import * as files from '../../platform/files';
import { parseNum } from '../../lib/number';
import { todayISO } from '../../lib/date';
import type { Settings } from '../../types';
import { ImportDialog } from './ImportDialog';

function NumSetting(p: { label: string; value: number | undefined; onChange(v: number | undefined): void; suffix?: string }) {
  const [text, setText] = useState(p.value === undefined ? '' : String(p.value));
  return (
    <label className="setting">
      <span>{p.label}</span>
      <span>
        <input aria-label={p.label} inputMode="decimal" value={text} style={{ width: '4.5em' }}
          onChange={(e) => { setText(e.target.value); p.onChange(parseNum(e.target.value)); }} />
        {p.suffix && <span className="unit"> {p.suffix}</span>}
      </span>
    </label>
  );
}

export function SettingsScreen() {
  const s = live.settings();
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [message, setMessage] = useState('');
  if (!s) return <section className="screen" />;

  const save = (patch: Partial<Omit<Settings, 'id'>>) => void repo.saveSettings(patch);
  const range = s.defaultTargetRange;

  const exportBackup = async () => {
    const text = JSON.stringify(await buildBackup());
    const result = await files.shareOrDownload(`workout-log-${todayISO()}.json`, text);
    if (result !== 'cancelled') { await repo.saveSettings({ lastBackupAt: Date.now() }); setMessage('백업 파일을 저장했어요'); }
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMessage('');
    try {
      setImportPlan(await planImport(parseBackup(await files.readFile(file))));
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  return (
    <section className="screen settings">
      <h2>설정</h2>

      <h3>백업</h3>
      <div className="panel">
        <p className="muted small">
          기록은 이 기기에만 저장돼요. 파일 앱이나 iCloud Drive에 백업 파일을 저장해 두세요.<br />
          마지막 백업: {s.lastBackupAt ? format(s.lastBackupAt, 'yyyy-MM-dd HH:mm') : '없음'}
        </p>
        <div className="row">
          <button className="primary" onClick={() => void exportBackup()}>백업 내보내기</button>
          <label className="chip file-btn">백업 가져오기
            <input type="file" accept="application/json,.json" aria-label="백업 파일 선택"
              onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        {message && <p role="status">{message}</p>}
        {importPlan && <ImportDialog plan={importPlan} onDone={(m) => { setImportPlan(null); setMessage(m); }} />}
        <NumSetting label="백업 알림 주기(일)" value={s.backupReminderDays} onChange={(v) => v && save({ backupReminderDays: v })} />
      </div>

      <h3>루틴</h3>
      <div className="panel">
        <p className="muted small">루틴을 등록할 때 처음 채울 목표 횟수예요. 비워 두면 그날 한 횟수로 정해요.</p>
        <div className="row">
          <NumSetting label="기본 목표 최소" value={range?.min}
            onChange={(v) => save({ defaultTargetRange: v === undefined ? null : { min: v, max: Math.max(v, range?.max ?? v + 2) } })} />
          <NumSetting label="기본 목표 최대" value={range?.max}
            onChange={(v) => save({ defaultTargetRange: v === undefined || !range ? null : { min: Math.min(range.min, v), max: v } })} />
        </div>
        <label className="setting">
          <span>저중량 날 추정 1RM 비율 표시</span>
          <input type="checkbox" aria-label="저중량 날 추정 1RM 비율 표시" checked={s.showLightRatio} onChange={(e) => save({ showLightRatio: e.target.checked })} />
        </label>
      </div>

      <h3>디로드</h3>
      <div className="panel">
        <NumSetting label="디로드 주기(바퀴)" value={s.deloadEveryLaps} onChange={(v) => v && save({ deloadEveryLaps: Math.round(v) })} />
        <NumSetting label="디로드 세트 비율(%)" value={Math.round(s.deloadSetRatio * 100)} suffix="%"
          onChange={(v) => v && save({ deloadSetRatio: Math.min(100, v) / 100 })} />
        <NumSetting label="디로드 무게 감소(%)" value={Math.round(s.deloadWeightReduction * 100)} suffix="%"
          onChange={(v) => v !== undefined && save({ deloadWeightReduction: Math.min(90, v) / 100 })} />
      </div>
    </section>
  );
}
