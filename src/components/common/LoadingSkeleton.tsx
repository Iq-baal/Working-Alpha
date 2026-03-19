import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton = ({ width, height, borderRadius = 8, style, className }: SkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      className={`shimmer ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const TransactionSkeleton = () => (
  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
    <Skeleton width={44} height={44} borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={10} />
    </div>
    <div style={{ textAlign: 'right' }}>
      <Skeleton width={50} height={16} style={{ marginBottom: 4 }} />
      <Skeleton width={30} height={10} style={{ marginLeft: 'auto' }} />
    </div>
  </div>
);

export const BalanceSkeleton = () => (
  <div style={{ padding: '28px 24px 24px' }}>
    <Skeleton width={100} height={24} borderRadius={999} style={{ marginBottom: 20 }} />
    <Skeleton width="30%" height={12} style={{ marginBottom: 8 }} />
    <Skeleton width="80%" height={56} style={{ marginBottom: 12 }} />
    <Skeleton width="50%" height={12} />
  </div>
);
