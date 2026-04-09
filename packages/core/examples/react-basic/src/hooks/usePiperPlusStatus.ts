import { useEffect, useState } from 'react';

interface PiperPlusAssetStatus {
  available: boolean;
  error: string | null;
}

export interface PiperPlusStatus extends PiperPlusAssetStatus {
  loading: boolean;
}

const PIPER_PLUS_ASSET_URL = `${import.meta.env.BASE_URL}piper/dist/ort.min.js`;
const statusCache = new Map<string, PiperPlusAssetStatus>();
const pendingChecks = new Map<string, Promise<PiperPlusAssetStatus>>();

async function checkPiperPlusAssets(
  assetUrl: string,
): Promise<PiperPlusAssetStatus> {
  const cachedStatus = statusCache.get(assetUrl);
  if (cachedStatus) {
    return cachedStatus;
  }

  const pendingCheck = pendingChecks.get(assetUrl);
  if (pendingCheck) {
    return pendingCheck;
  }

  const nextCheck = (async () => {
    try {
      const response = await fetch(assetUrl, {
        method: 'HEAD',
        cache: 'no-store',
      });

      const contentType = response.headers.get('content-type') || '';
      const isJavaScript =
        contentType.includes('javascript') ||
        contentType.includes('application/octet-stream');

      const nextStatus = {
        available: response.ok && isJavaScript,
        error: null,
      };

      statusCache.set(assetUrl, nextStatus);
      return nextStatus;
    } catch (error) {
      const nextStatus = {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check Piper Plus assets',
      };

      statusCache.set(assetUrl, nextStatus);
      return nextStatus;
    } finally {
      pendingChecks.delete(assetUrl);
    }
  })();

  pendingChecks.set(assetUrl, nextCheck);
  return nextCheck;
}

export function usePiperPlusStatus(): PiperPlusStatus {
  const cachedStatus = statusCache.get(PIPER_PLUS_ASSET_URL);
  const [status, setStatus] = useState<PiperPlusStatus>(
    cachedStatus
      ? {
          ...cachedStatus,
          loading: false,
        }
      : {
          available: false,
          loading: true,
          error: null,
        },
  );

  useEffect(() => {
    let active = true;

    const cachedResult = statusCache.get(PIPER_PLUS_ASSET_URL);
    if (cachedResult) {
      setStatus({
        ...cachedResult,
        loading: false,
      });
      return () => {
        active = false;
      };
    }

    setStatus({
      available: false,
      loading: true,
      error: null,
    });

    void checkPiperPlusAssets(PIPER_PLUS_ASSET_URL).then((nextStatus) => {
      if (!active) {
        return;
      }

      setStatus({
        ...nextStatus,
        loading: false,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  return status;
}
