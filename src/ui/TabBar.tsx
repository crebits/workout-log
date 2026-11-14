export type Tab = 'calendar' | 'records' | 'routines' | 'search' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'calendar', label: '달력', icon: '📅' },
  { id: 'records', label: '기록', icon: '🏆' },
  { id: 'routines', label: '루틴', icon: '🔁' },
  { id: 'search', label: '검색', icon: '🔍' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange(t: Tab): void }) {
  return (
    <nav className="tabbar" aria-label="메인">
      {TABS.map((t) => (
        <button key={t.id} className={t.id === tab ? 'active' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <span aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
