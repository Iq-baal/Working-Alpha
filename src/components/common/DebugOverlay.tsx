import { useEffect, useMemo, useRef, useState } from 'react';

const DEBUG_KEY = 'payme_debug';

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') {
      try {
        localStorage.setItem(DEBUG_KEY, '1');
      } catch {
        // ignore storage write failures (private mode)
      }
      return true;
    }
    try {
      return localStorage.getItem(DEBUG_KEY) === '1';
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function setDebugEnabled(next: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (next) localStorage.setItem(DEBUG_KEY, '1');
    else localStorage.removeItem(DEBUG_KEY);
  } catch {
    // ignore
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' && value.length > 14) {
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }
  return String(value);
}

type DebugSnapshot = {
  authState: string;
  authError: string | null;
  sdkHasLoaded: boolean;
  isLoggedIn: boolean;
  authUserId: string | null;
  lastKnownUserId: string | null;
  walletId: string | null;
  walletAddress: string | null;
  tokenPresent: boolean;
  sessionPinned: boolean;
  sessionKey: string | null;
  authStable: boolean;
  mode: string;
  step: string;
  isLoading: boolean;
  hasBoundLiveSession: boolean;
  hasResolvedLiveProfile: boolean;
  profileLoaded: boolean;
  bonusClaimed: boolean | null;
};

export default function DebugOverlay({ snapshot }: { snapshot: DebugSnapshot }) {
  const [open, setOpen] = useState(isDebugEnabled());
  const [events, setEvents] = useState<string[]>([]);
  const prevRef = useRef('');

  const line = useMemo(() => {
    return [
      `state=${formatValue(snapshot.authState)}`,
      `error=${formatValue(snapshot.authError)}`,
      `loaded=${formatValue(snapshot.sdkHasLoaded)}`,
      `loggedIn=${formatValue(snapshot.isLoggedIn)}`,
      `user=${formatValue(snapshot.authUserId)}`,
      `lastUser=${formatValue(snapshot.lastKnownUserId)}`,
      `wallet=${formatValue(snapshot.walletId)}`,
      `addr=${formatValue(snapshot.walletAddress)}`,
      `token=${formatValue(snapshot.tokenPresent)}`,
      `pinned=${formatValue(snapshot.sessionPinned)}`,
      `session=${formatValue(snapshot.sessionKey)}`,
      `stable=${formatValue(snapshot.authStable)}`,
      `mode=${formatValue(snapshot.mode)}`,
      `step=${formatValue(snapshot.step)}`,
      `loading=${formatValue(snapshot.isLoading)}`,
      `bound=${formatValue(snapshot.hasBoundLiveSession)}`,
      `profile=${formatValue(snapshot.hasResolvedLiveProfile)}`,
      `profileLoaded=${formatValue(snapshot.profileLoaded)}`,
      `bonus=${formatValue(snapshot.bonusClaimed)}`,
    ].join(' | ');
  }, [snapshot]);

  useEffect(() => {
    const next = JSON.stringify(snapshot);
    if (prevRef.current === next) return;
    prevRef.current = next;
    const stamp = new Date().toISOString().slice(11, 19);
    setEvents((prev) => [`${stamp} ${line}`, ...prev].slice(0, 60));
  }, [snapshot, line]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setDebugEnabled(next);
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(events.join('\n'));
    } catch {
      // ignore
    }
  };

  if (!open) {
    if (!isDebugEnabled()) return null;
    return (
      <button
        onClick={toggle}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 2000,
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.6px',
          cursor: 'pointer',
        }}
      >
        DBG
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 2000,
        maxWidth: 520,
        background: 'rgba(10, 15, 31, 0.94)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 16,
        padding: 12,
        color: '#f8fafc',
        fontSize: 11,
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, letterSpacing: '0.6px' }}>DEBUG</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyLogs}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            Copy
          </button>
          <button
            onClick={toggle}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            Hide
          </button>
        </div>
      </div>
      <div style={{ opacity: 0.9, marginBottom: 8 }}>{line}</div>
      <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        {events.map((evt) => (
          <div key={evt} style={{ marginBottom: 4, color: 'rgba(255,255,255,0.7)' }}>
            {evt}
          </div>
        ))}
      </div>
    </div>
  );
}
