export const MAX_READ_BYTES = 120 * 1024;
export const MAX_WRITE_BYTES = 200 * 1024;
export const MAX_COMMAND_OUTPUT_BYTES = 200 * 1024;
export const DEFAULT_COMMAND_TIMEOUT_MS = 20_000;
export const MAX_COMMAND_TIMEOUT_MS = 20_000;

export function truncateUtf8(
  content: string,
  maxBytes: number,
): { content: string; truncated: boolean } {
  const totalBytes = Buffer.byteLength(content, "utf8");
  if (totalBytes <= maxBytes) {
    return { content, truncated: false };
  }

  const half = Math.floor(maxBytes / 2);
  const head = sliceUtf8ByBytes(content, 0, half);
  const tail = sliceUtf8ByBytes(content, totalBytes - half, totalBytes);

  return {
    content: `${head}\n...truncated...\n${tail}`,
    truncated: true,
  };
}

function sliceUtf8ByBytes(
  value: string,
  startByte: number,
  endByte: number,
): string {
  const buf = Buffer.from(value, "utf8");
  return buf.subarray(startByte, endByte).toString("utf8");
}
