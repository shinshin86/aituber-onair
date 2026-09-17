declare module 'node:fs' {
  // biome-ignore lint/style/useNodejsImportProtocol: Bridges Node 12 type packages to node: imports.
  export * from 'fs';
}

declare module 'node:path' {
  // biome-ignore lint/style/useNodejsImportProtocol: Bridges Node 12 type packages to node: imports.
  export * from 'path';
}

declare module 'node:crypto' {
  // biome-ignore lint/style/useNodejsImportProtocol: Bridges older Node type packages.
  export * from 'crypto';
}
