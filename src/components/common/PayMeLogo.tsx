import { motion } from 'framer-motion';

interface PayMeLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export default function PayMeLogo({ size = 40, showText = true, textSize = '22px' }: PayMeLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 29L2 22L16 15L30 22L16 29Z" fill="#7C3AED" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 23L2 16L16 9L30 16L16 23Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 17L2 10L16 3L30 10L16 17Z" fill="#FF4F17" stroke="#FF4F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontSize: textSize,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: 'var(--color-text)',
          }}>
            Pay<span style={{ color: '#F97316' }}>Me</span>
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--color-text-3)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>Protocol</span>
        </div>
      )}
    </div>
  );
}

// Animated version for splash/onboarding
export function PayMeLogoAnimated({ size = 56 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <PayMeLogo size={size} showText={true} textSize="28px" />
    </motion.div>
  );
}
