import { useState } from 'react';
import { applyImport, type ImportPlan } from '../../data/backup';

export function ImportDialog({ plan, onDone }: { plan: ImportPlan; onDone(msg: string): void }) {
  const [choice, setChoice] = useState<'keep' | 'replace'>('keep');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await applyImport(plan, choice);
    onDone(`가져오기 완료: ${plan.newDates.length + (choice === 'replace' ? plan.conflictDates.length : 0)}일 반영`);
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
      <div className="row">
        <button className="primary" disabled={busy} onClick={() => void run()}>가져오기 실행</button>
        <button className="chip" onClick={() => onDone('')}>취소</button>
      </div>
    </fieldset>
  );
}
