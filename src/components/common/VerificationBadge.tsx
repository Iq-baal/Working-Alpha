/**
 * VerificationBadge — pixel-identical to X (Twitter) verified checkmark
 * Level 1 = blue  (name + occupation + photo)
 * Level 2 = green (government ID, mainnet only)
 * Level 3 = orange (merchant, mainnet only)
 */
interface VerificationBadgeProps {
  level: number;
  size?: number;
  showMainnetLabel?: boolean;
}

const BADGE_CONFIG: Record<number, { color: string; label: string }> = {
  1: { color: '#1D9BF0', label: 'Verified' },
  2: { color: '#22C55E', label: 'ID Verified' },
  3: { color: '#F97316', label: 'Merchant' },
};

export default function VerificationBadge({ level, size = 16, showMainnetLabel = false }: VerificationBadgeProps) {
  if (!level || level < 1) return null;
  const config = BADGE_CONFIG[level];
  if (!config) return null;

  return (
    <span
      title={config.label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, lineHeight: 1 }}
    >
      {/* X/Twitter-identical badge: rosette path + checkmark path */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={config.label}
        style={{ color: config.color }}
      >
        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.76 1.87 3.45-.14.415-.22.86-.22 1.3 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25.52 1.334 1.828 2.25 3.337 2.25s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.44-.08-.885-.22-1.3 1.114-.69 1.87-1.99 1.87-3.45z" />
        <path fill="var(--color-text)" d="M10.024 16.51l-3.33-3.328 1.43-1.45 1.868 1.878 4.542-4.735 1.474 1.398-6 6.236z" />
      </svg>

      {showMainnetLabel && level >= 2 && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: config.color,
          background: `${config.color}18`,
          borderRadius: 4, padding: '1px 5px', letterSpacing: '0.3px',
        }}>
          MAINNET
        </span>
      )}
    </span>
  );
}
