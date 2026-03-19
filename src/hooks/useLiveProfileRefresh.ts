import { useEffect, useState } from 'react';
import { getLiveProfileRefreshKey, onLiveProfileRefresh } from '../lib/appState';

export function useLiveProfileRefreshKey() {
  const [key, setKey] = useState(getLiveProfileRefreshKey());

  useEffect(() => onLiveProfileRefresh(setKey), []);

  return key;
}

