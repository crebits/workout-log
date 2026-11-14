import { useState } from 'react';
import { TabBar, type Tab } from './TabBar';
import { CalendarScreen } from './calendar/CalendarScreen';
import { EntryModal } from './entry/EntryModal';
import { RoutinesScreen } from './routines/RoutinesScreen';
import type { ISODate } from '../types';
import './styles.css';

export default function App() {
  const [tab, setTab] = useState<Tab>('calendar');
  const [openDate, setOpenDate] = useState<ISODate | null>(null);
  return (
    <div className="app">
      <main>
        {tab === 'calendar' && <CalendarScreen onOpenDate={setOpenDate} />}
        {tab === 'routines' && <RoutinesScreen />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      {openDate && <EntryModal key={openDate} date={openDate} onClose={() => setOpenDate(null)} />}
    </div>
  );
}
