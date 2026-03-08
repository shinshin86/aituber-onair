import { basename } from "node:path";

const SENSITIVE_PATTERNS: RegExp[] = [
  /^\.env(\..*)?$/,
  /\.pem$/i,
  /^id_rsa$/,
  /^node_modules[\\/]\.cache([\\/]|$)/,
];

export class SecretPolicy {
  isSensitivePath(relativePath: string): boolean {
    const normalized = relativePath.replaceAll("\\\\", "/");
    const base = basename(normalized);
    return SENSITIVE_PATTERNS.some(
      (pattern) => pattern.test(normalized) || pattern.test(base),
    );
  }

  assertReadable(relativePath: string): void {
    if (this.isSensitivePath(relativePath)) {
      throw new Error("Access blocked: path is sensitive");
    }
  }

  assertWritable(relativePath: string): void {
    if (this.isSensitivePath(relativePath)) {
      throw new Error("Write blocked: path is sensitive");
    }
  }
}
