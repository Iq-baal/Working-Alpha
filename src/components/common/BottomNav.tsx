import { Home, Clock, Store, Globe, User } from 'lucide-react';
import type { Tab } from '../../types';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'wallet',   label: 'Wallet',   Icon: Home },
  { id: 'history',  label: 'History',  Icon: Clock },
  { id: 'merchant', label: 'Merchant', Icon: Store },
  { id: 'network',  label: 'Network',  Icon: Globe },
  { id: 'settings', label: 'Account',  Icon: User },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(id)}
            style={{ background: 'none', border: 'none', position: 'relative' }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
            </div>
            <span style={{ position: 'relative', zIndex: 1, fontWeight: isActive ? 600 : 400 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
