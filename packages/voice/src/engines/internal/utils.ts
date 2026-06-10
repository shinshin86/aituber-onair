export function buildQueryUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string | undefined> = {},
): string {
  const base = baseUrl.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export function decodeHexToArrayBuffer(hex: string): ArrayBuffer {
  const cleanHex = hex.replace(/[\s\n]/g, '');

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string: contains non-hex characters');
  }

  const buffer = new ArrayBuffer(cleanHex.length / 2);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < cleanHex.length; i += 2) {
    view[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }

  return buffer;
}

export function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, value));
}

export function clampNumberWithFallback(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Number.isFinite(clamped) ? clamped : fallback;
}
