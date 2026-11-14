import { useState } from 'react';
import * as backup from '../../data/backup';
import type { ImportPlan } from '../../data/backup';

export function ImportDialog({ plan, onDone }: { plan: ImportPlan; onDone(msg: string): void }) {
  const [choice, setChoice] = useState<'keep' | 'replace'>('keep');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await backup.applyImport(plan, choice);
      onDone(`가져오기 완료: ${plan.newDates.length + (choice === 'replace' ? plan.conflictDates.length : 0)}일 반영`);
    } catch {
      // 한 트랜잭션이라 실패하면 아무것도 바뀌지 않는다
      setError('가져오기에 실패했어요. 기존 기록은 그대로예요. 다시 눌러 주세요.');
      setBusy(false);
    }
  };
  return (
    <fieldset className="panel" role="group" aria-label="가져오기 확인">
      <legend>가져오기</legend>
      <p>새로 추가 {plan.newDates.length}일, 겹치는 날짜 {plan.conflictDates.length}일</p>
      {plan.conflictDates.length > 0 && (
        <div className="row" role="radiogroup" aria-label="겹치는 날짜 처리">
          <label><input type="radio" name="conflict" checked={choice === 'keep'} onChange={() => setChoice('keep')} /> 기존 유지</label>
          <label><input type="radio" name="conflict" checked={choice === 'replace'} onChange={() => setChoice('replace')} /> 백업으로 바꾸기</label>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="primary" disabled={busy} onClick={() => void run()}>가져오기 실행</button>
        <button className="chip" onClick={() => onDone('')}>취소</button>
      </div>
    </fieldset>
  );
}
