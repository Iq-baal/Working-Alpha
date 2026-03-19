import { motion } from 'framer-motion';

/**
 * ReusableAppleBackButton — looks and feels like iOS's native back button.
 * Chevron + optional label, tap-active scale, clean typography.
 */
interface AppleBackButtonProps {
  label?: string;
  onBack: () => void;
}

export default function AppleBackButton({ label = 'Back', onBack }: AppleBackButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9, opacity: 0.7 }}
      onClick={onBack}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', padding: '4px 0',
        cursor: 'pointer', color: '#F97316',
        fontSize: 17, fontWeight: 400,
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Apple-style chevron: thin, angled, slightly taller than wide */}
      <svg
        width="12" height="21"
        viewBox="0 0 12 21"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, marginRight: 2 }}
      >
        <path
          d="M10.5 1.5 L2 10.5 L10.5 19.5"
          stroke="#F97316"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </motion.button>
  );
}
