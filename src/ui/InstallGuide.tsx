import { useState } from 'react';
import * as install from '../platform/install';

export function InstallGuide() {
  const [hidden, setHidden] = useState(() => install.isStandalone() || !install.isIOS() || install.isGuideDismissed());
  if (hidden) return null;
  return (
    <div className="install-guide" role="note">
      <p>
        <strong>홈 화면에 추가해 주세요.</strong> Safari 아래쪽 공유 버튼(□↑) → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있고,
        기록이 더 안전하게 보관됩니다.
      </p>
      <button className="icon" aria-label="안내 닫기" onClick={() => { install.dismissGuide(); setHidden(true); }}>✕</button>
    </div>
  );
}
