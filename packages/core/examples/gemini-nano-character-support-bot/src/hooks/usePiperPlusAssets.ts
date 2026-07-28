import { useEffect, useMemo, useState } from 'react';
import { getPiperPlusAssetChecks, getPiperPlusAssetUrls } from '../support';

export type PiperPlusAssetStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'missing'
  | 'error';

export interface PiperPlusAssetCheck {
  status: PiperPlusAssetStatus;
  checked: number;
  total: number;
  missingUrls: string[];
  error: string | null;
}

type FetchAsset = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const idleStatus = (total: number): PiperPlusAssetCheck => ({
  status: 'idle',
  checked: 0,
  total,
  missingUrls: [],
  error: null,
});

export async function checkPiperPlusAssets(
  baseUrl: string,
  fetchAsset: FetchAsset = fetch,
  onProgress?: (checked: number, total: number) => void,
): Promise<PiperPlusAssetCheck> {
  const assetChecks = getPiperPlusAssetChecks(baseUrl);
  const missingUrls: string[] = [];
  let checked = 0;
  let checkError: string | null = null;

  await Promise.all(
    assetChecks.map(async ({ url: assetUrl, size: expectedSize }) => {
      try {
        const response = await fetchAsset(assetUrl, {
          method: 'HEAD',
          cache: 'no-store',
        });
        const contentType = response.headers.get('content-type') ?? '';
        const contentEncoding = response.headers.get('content-encoding');
        const contentLength = response.headers.get('content-length');
        const hasUnexpectedSize =
          !contentEncoding &&
          contentLength !== null &&
          Number(contentLength) !== expectedSize;

        if (
          !response.ok ||
          contentType.includes('text/html') ||
          hasUnexpectedSize
        ) {
          missingUrls.push(assetUrl);
        }
      } catch (error) {
        checkError ??=
          error instanceof Error
            ? error.message
            : 'Failed to check PiperPlus assets';
      } finally {
        checked += 1;
        onProgress?.(checked, assetChecks.length);
      }
    }),
  );

  if (checkError) {
    return {
      status: 'error',
      checked,
      total: assetChecks.length,
      missingUrls,
      error: checkError,
    };
  }

  return {
    status: missingUrls.length === 0 ? 'available' : 'missing',
    checked,
    total: assetChecks.length,
    missingUrls,
    error: null,
  };
}

export function usePiperPlusAssets(
  enabled: boolean,
  baseUrl = import.meta.env.BASE_URL,
): PiperPlusAssetCheck {
  const assetUrls = useMemo(() => getPiperPlusAssetUrls(baseUrl), [baseUrl]);
  const [check, setCheck] = useState<PiperPlusAssetCheck>(() =>
    idleStatus(assetUrls.length),
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (!enabled) {
        setCheck(idleStatus(assetUrls.length));
        return;
      }

      setCheck({
        status: 'checking',
        checked: 0,
        total: assetUrls.length,
        missingUrls: [],
        error: null,
      });

      void checkPiperPlusAssets(baseUrl, fetch, (checked, total) => {
        if (cancelled) return;
        setCheck({
          status: 'checking',
          checked,
          total,
          missingUrls: [],
          error: null,
        });
      }).then((nextCheck) => {
        if (!cancelled) setCheck(nextCheck);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [assetUrls.length, baseUrl, enabled]);

  return check;
}
