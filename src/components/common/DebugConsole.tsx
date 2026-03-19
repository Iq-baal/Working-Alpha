import { useState, useEffect } from 'react';
import { errorLog, pushError } from './ErrorBoundary';

// Patch console.error to capture logs
const _origError = console.error.bind(console);
console.error = (...args: any[]) => {
  pushError('[console.error] ' + args.map(a => (a instanceof Error ? a.stack || a.message : String(a))).join(' '));
  _origError(...args);
};
const _origWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  pushError('[console.warn] ' + args.map(a => String(a)).join(' '));
  _origWarn(...args);
};

export default function DebugConsole() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<typeof errorLog>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLogs([...errorLog]);
    const id = setInterval(() => setLogs([...errorLog]), 1000);
    return () => clearInterval(id);
  }, [open]);

  const copyAll = () => {
    const text = logs.map(l => `[${l.time}] ${l.message}${l.stack ? '\n' + l.stack : ''}`).join('\n\n');
    navigator.clipboard.writeText(text || 'No errors captured.').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Floating trigger button — small, bottom-left */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 80, left: 12, zIndex: 9998,
          width: 32, height: 32, borderRadius: '50%',
          background: errorLog.length > 0 ? 'rgba(239,68,68,0.85)' : 'rgba(100,100,100,0.5)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#fff', backdropFilter: 'blur(4px)',
        }}
        title="Debug console"
      >
        {errorLog.length > 0 ? '⚠' : '🐛'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #333',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              Debug Console ({logs.length} entries)
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={copyAll}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: copied ? '#22C55E' : '#F97316',
                  border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {copied ? 'Copied!' : 'Copy all'}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: '#333', border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {logs.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                No errors captured yet.
              </p>
            ) : (
              [...logs].reverse().map((entry, i) => (
                <div key={i} style={{
                  marginBottom: 12,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 6,
                  borderLeft: '3px solid #EF4444',
                }}>
                  <div style={{ color: '#F59E0B', fontSize: 10, marginBottom: 4 }}>{entry.time}</div>
                  <div style={{ color: '#fff', fontSize: 11, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {entry.message}
                  </div>
                  {entry.stack && (
                    <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 6, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {entry.stack}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
