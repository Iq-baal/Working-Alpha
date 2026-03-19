import { useState, useEffect } from 'react';

/**
 * Simple hook for async queries
 * Returns data and loading state
 * Pass null as queryFn to skip the query
 */
export function useAsyncQuery<T>(
  queryFn: (() => Promise<T>) | null,
  deps: any[] = []
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!queryFn) {
      return;
    }

    let cancelled = false;

    queryFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('useAsyncQuery error:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return data;
}
