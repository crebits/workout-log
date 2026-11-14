import { useEffect, useState } from 'react';
import { todayISO } from '../lib/date';
import { onPageShow } from '../platform/lifecycle';

/** 오늘 날짜. 앱이 다시 보이거나 1분마다 확인해서 자정이 지나면 바뀐다 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const check = () => setToday(todayISO());
    const off = onPageShow(check);
    const timer = setInterval(check, 60_000);
    return () => { off(); clearInterval(timer); };
  }, []);
  return today;
}
