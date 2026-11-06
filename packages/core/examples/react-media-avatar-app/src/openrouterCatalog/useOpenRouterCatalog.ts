import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  TTL_MS,
  getCatalogSnapshot,
  refreshCatalog,
  subscribeCatalog,
} from './catalog';

export function useOpenRouterCatalog(enabled = true) {
  const snapshot = useSyncExternalStore(
    subscribeCatalog,
    getCatalogSnapshot,
    getCatalogSnapshot,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    void refreshCatalog();
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [enabled]);
  return {
    ...snapshot,
    stale:
      snapshot.updatedAt !== null &&
      (snapshot.status === 'error' || now - snapshot.updatedAt >= TTL_MS),
    refresh: () => refreshCatalog(true),
  };
}
