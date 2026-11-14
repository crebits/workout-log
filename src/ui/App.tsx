import { lazy, Suspense, useEffect, useState } from 'react';
import { TabBar, type Tab } from './TabBar';
import { CalendarScreen } from './calendar/CalendarScreen';
import { EntryModal } from './entry/EntryModal';
import { RoutinesScreen } from './routines/RoutinesScreen';
import { SearchScreen } from './search/SearchScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { InstallGuide } from './InstallGuide';
import { requestPersist } from '../platform/install';
import type { ISODate } from '../types';
import './styles.css';

// 그래프 라이브러리가 커서 기록 화면은 따로 불러온다
const RecordsScreen = lazy(() => import('./records/RecordsScreen').then((m) => ({ default: m.RecordsScreen })));

export default function App() {
  const [tab, setTab] = useState<Tab>('calendar');
  const [openDate, setOpenDate] = useState<ISODate | null>(null);
  useEffect(() => { void requestPersist(); }, []);
  return (
    <div className="app">
      <main>
        <InstallGuide />
        {tab === 'calendar' && <CalendarScreen onOpenDate={setOpenDate} />}
        {tab === 'routines' && <RoutinesScreen />}
        {tab === 'records' && <Suspense fallback={<p className="muted">불러오는 중…</p>}><RecordsScreen onOpenDate={setOpenDate} /></Suspense>}
        {tab === 'search' && <SearchScreen onOpenDate={setOpenDate} />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      {openDate && <EntryModal key={openDate} date={openDate} onClose={() => setOpenDate(null)} />}
    </div>
  );
}
