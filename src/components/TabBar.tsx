export type Tab = 'home' | 'playlist' | 'extractor';

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'playlist', label: 'Playlist', icon: '♬' },
  { id: 'extractor', label: 'Extractor', icon: '✂' }
];

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
