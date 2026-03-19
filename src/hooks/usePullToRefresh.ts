import { useRef, useState } from 'react';

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.classList.contains('scroll-content')) return current;
    current = current.parentElement;
  }
  return null;
}

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const threshold = 72;
  const maxPull = 110;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (refreshing) return;
    const scrollEl = findScrollableAncestor(rootRef.current);
    scrollRef.current = scrollEl;
    if (!scrollEl || scrollEl.scrollTop > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (refreshing || startYRef.current === null) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl || scrollEl.scrollTop > 0) return;

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    // Soft resistance curve.
    const resisted = Math.min(maxPull, Math.pow(delta, 0.88));
    setPullDistance(resisted);
  };

  const onTouchEnd = async () => {
    if (refreshing) return;
    if (pullDistance < threshold) {
      setPullDistance(0);
      startYRef.current = null;
      return;
    }

    setRefreshing(true);
    setPullDistance(56);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
      startYRef.current = null;
    }
  };

  return {
    rootRef,
    pullDistance,
    refreshing,
    ready: pullDistance >= threshold,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
}
