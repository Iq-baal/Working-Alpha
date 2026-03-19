import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Gem, Globe, Lock } from 'lucide-react';
import { SOLANA_RPC } from '../../lib/utils';

interface SolanaStats {
  tps: number;
  epoch: number;
  progress: number;
  blockHeight: number;
  health: 'ok' | 'behind' | 'unknown';
}

const BAR_COUNT = 28;
const MAX_TPS = 3500;
const BAR_FLOOR = 0.18;

function generateBars(tps: number, tick: number) {
  const base = tps > 0 ? Math.min(tps / MAX_TPS, 1) : 0.12;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const wave1 = Math.sin(tick + i * 0.38) * 0.42;
    const wave2 = Math.sin(tick * 1.7 + i * 0.6) * 0.24;
    const noise = Math.sin(tick * 2.3 + i * 1.1) * 0.08;
    const raw = base + wave1 + wave2 + noise;
    return Math.max(BAR_FLOOR, Math.min(1, 0.3 + Math.sqrt(Math.max(0, raw)) * 0.68));
  });
}

export default function NetworkTab() {
  const [stats, setStats] = useState<SolanaStats>({ tps: 0, epoch: 0, progress: 0, blockHeight: 0, health: 'unknown' });
  const [loading, setLoading] = useState(true);
  const [bars, setBars] = useState<number[]>(() => generateBars(0, 0));
  const tpsRef = useRef(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(SOLANA_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { jsonrpc: '2.0', id: 1, method: 'getRecentPerformanceSamples', params: [6] },
            { jsonrpc: '2.0', id: 2, method: 'getEpochInfo', params: [] },
            { jsonrpc: '2.0', id: 3, method: 'getHealth', params: [] },
          ]),
        });

        if (!res.ok) throw new Error('Network response error');
        const data = await res.json();
        const perfSamples = data[0]?.result || [];
        const epochInfo = data[1]?.result || {};
        const healthResult = data[2]?.result;
        const health: SolanaStats['health'] = healthResult === 'ok' ? 'ok' : 'behind';

        const avgTps = perfSamples.length > 0
          ? Math.round(
              perfSamples.reduce(
                (a: number, s: { numTransactions: number; samplePeriodSecs: number }) =>
                  a + s.numTransactions / Math.max(s.samplePeriodSecs, 1),
                0
              ) / perfSamples.length
            )
          : 0;

        const newStats = {
          tps: avgTps,
          epoch: epochInfo.epoch || 0,
          progress: epochInfo.slotIndex && epochInfo.slotsInEpoch
            ? Math.round((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100)
            : 0,
          blockHeight: epochInfo.absoluteSlot || 0,
          health,
        };

        setStats(newStats);
        tpsRef.current = newStats.tps;
      } catch {
        setStats(s => ({ ...s, health: s.health === 'unknown' ? 'unknown' : 'behind' }));
      } finally {
        setLoading(false);
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchStats();
    };

    refreshIfVisible();
    const interval = window.setInterval(refreshIfVisible, 12000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  // Keep the visualizer moving without forcing React to re-render every frame.
  useEffect(() => {
    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 0.11;
      setBars(generateBars(tpsRef.current, tick));
    }, 800);
    return () => window.clearInterval(interval);
  }, []);

  const healthColor = stats.health === 'ok' ? '#22C55E' : stats.health === 'behind' ? '#F59E0B' : '#6B7280';
  const healthLabel = stats.health === 'ok' ? 'All Systems Go' : stats.health === 'behind' ? 'Slightly Degraded' : 'Checking...';

  return (
    <div style={{ padding: '20px 20px 0' }}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px' }}>Network</h2>
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 9, height: 9, borderRadius: '50%', background: healthColor, boxShadow: `0 0 10px ${healthColor}` }}
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 24 }}>
          Solana Devnet · {healthLabel}
        </p>

        {/* Spectrum Visualizer */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(249,115,22,0.05) 0%, rgba(0,0,0,0) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 24,
          padding: '24px 16px 0',
          marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow behind bars */}
          <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 40, background: 'rgba(249,115,22,0.12)', filter: 'blur(20px)', borderRadius: '50%' }} />

          {/* TPS counter */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '1.5px', marginBottom: 4 }}>TRANSACTIONS PER SECOND</p>
            <motion.p
              key={stats.tps}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-2.5px', fontVariantNumeric: 'tabular-nums' }}
            >
              {loading ? (
                <span style={{ color: 'var(--color-text-4)' }}>···</span>
              ) : (
                <span style={{ background: 'linear-gradient(135deg, #F97316, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stats.tps.toLocaleString()}
                </span>
              )}
            </motion.p>
          </div>

          {/* 3D Isometric Chart Container */}
          <div style={{ position: 'relative', height: 200, marginTop: 60, marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, transform: 'scale(0.95)' }}>
              {bars.map((h, i) => {
                const ratio = i / BAR_COUNT;
                // Pink/Magenta tones as seen in the reference structure
                const baseColor = stats.health === 'ok' ? `hsl(335, 85%, ${55 - ratio * 15}%)` : `hsl(25, 85%, 55%)`;
                const topColor = stats.health === 'ok' ? `hsl(335, 85%, ${70 - ratio * 10}%)` : `hsl(25, 85%, 70%)`;
                const sideColor = stats.health === 'ok' ? `hsl(335, 85%, ${45 - ratio * 15}%)` : `hsl(25, 85%, 45%)`;

                return (
                  <div key={i} style={{
                    position: 'relative',
                    width: 14,
                    height: `${Math.max(12, h * 170)}px`,
                    background: `linear-gradient(to bottom, ${baseColor}, ${sideColor})`,
                    transition: 'height 0.15s ease-out',
                    flexShrink: 0,
                    boxShadow: '4px 6px 8px rgba(0,0,0,0.06)',
                  }}>
                    {/* Top face */}
                    <div style={{
                      position: 'absolute', top: -7, left: 0, width: 14, height: 7,
                      background: topColor,
                      transformOrigin: 'bottom', transform: 'skewX(-45deg)'
                    }} />
                    {/* Right side face */}
                    <div style={{
                      position: 'absolute', top: -7, right: -7, width: 7, height: '100%',
                      background: sideColor,
                      transformOrigin: 'left', transform: 'skewY(-45deg)'
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floor line */}
          <div style={{ height: 1, background: 'var(--color-border)', margin: '0 0 16px' }} />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'TPS (live)', value: loading ? '···' : stats.tps.toLocaleString(), color: '#F97316', sub: 'transactions per second' },
            { label: 'Block', value: loading ? '···' : `#${stats.blockHeight.toLocaleString()}`, color: '#22C55E', sub: 'current slot' },
            { label: 'Epoch', value: loading ? '···' : stats.epoch.toString(), color: '#1D9BF0', sub: `${stats.progress}% complete` },
            { label: 'Network', value: 'Devnet', color: '#7C3AED', sub: 'beta testnet' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '16px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', letterSpacing: '0.8px', marginBottom: 6 }}>{label.toUpperCase()}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.5px', marginBottom: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Epoch progress bar */}
        {!loading && stats.progress > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Epoch {stats.epoch} Progress</span>
              <span style={{ fontSize: 12, color: '#F97316', fontWeight: 700 }}>{stats.progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #F97316, #7C3AED)', borderRadius: 999 }}
              />
            </div>
          </div>
        )}

        {/* Why Solana */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Why Solana?</p>
          {[
            { icon: <Zap size={20} color="#F97316" />, bold: 'Speed', text: '65,000 TPS capacity. Faster than Visa and Mastercard combined.' },
            { icon: <Gem size={20} color="#0EA5E9" />, bold: 'Cost', text: 'Under $0.001 per transaction. PayMe sponsors every fee.' },
            { icon: <Globe size={20} color="#22C55E" />, bold: 'Global', text: 'No borders. Send anywhere on earth in under 2 seconds.' },
            { icon: <Lock size={20} color="#7C3AED" />, bold: 'Security', text: 'Proof of History combined with PoS. Battle tested since 2020.' },
          ].map(({ icon, bold, text }) => (
            <div key={bold} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-2)' }}>
                <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>{bold}:</strong> {text}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
