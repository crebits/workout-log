import { useState } from 'react';
import { TabBar, type Tab } from './TabBar';
import { CalendarScreen } from './calendar/CalendarScreen';
import type { ISODate } from '../types';
import './styles.css';

export default function App() {
  const [tab, setTab] = useState<Tab>('calendar');
  const [, setOpenDate] = useState<ISODate | null>(null);
  return (
    <div className="app">
      <main>
        {tab === 'calendar' && <CalendarScreen onOpenDate={setOpenDate} />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
