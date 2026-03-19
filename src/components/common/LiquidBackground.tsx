import { motion } from 'framer-motion';

export default function LiquidBackground() {
  return (
    <div className="liquid-bg" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
    }}>
      {/* Amber blob — top right */}
      <motion.div
        animate={{
          x: [0, 30, -20, 10, 0],
          y: [0, -20, 30, -10, 0],
          scale: [1, 1.1, 0.95, 1.05, 1],
          borderRadius: [
            '60% 40% 30% 70% / 60% 30% 70% 40%',
            '30% 60% 70% 40% / 50% 60% 30% 60%',
            '50% 50% 40% 60% / 60% 40% 60% 40%',
            '60% 40% 30% 70% / 60% 30% 70% 40%',
          ],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '65vw', height: '65vw',
          maxWidth: 420, maxHeight: 420,
          right: '-15%', top: '-10%',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.05) 70%, transparent 100%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Teal blob — bottom left */}
      <motion.div
        animate={{
          x: [0, -25, 15, -10, 0],
          y: [0, 20, -15, 25, 0],
          scale: [1, 0.9, 1.15, 0.98, 1],
          borderRadius: [
            '40% 60% 60% 40% / 40% 40% 60% 60%',
            '60% 40% 40% 60% / 60% 60% 40% 40%',
            '50% 50% 60% 40% / 50% 60% 40% 50%',
            '40% 60% 60% 40% / 40% 40% 60% 60%',
          ],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute',
          width: '70vw', height: '70vw',
          maxWidth: 480, maxHeight: 480,
          left: '-20%', bottom: '10%',
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.22) 0%, rgba(20,184,166,0.05) 70%, transparent 100%)',
          filter: 'blur(50px)',
        }}
      />

      {/* White shimmer — center */}
      <motion.div
        animate={{
          opacity: [0.03, 0.06, 0.03],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          position: 'absolute',
          width: '50vw', height: '50vw',
          maxWidth: 300, maxHeight: 300,
          left: '25%', top: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, var(--color-border) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(var(--color-border) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Noise texture */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />
    </div>
  );
}
