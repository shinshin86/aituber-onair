declare module "diff" {
  export function applyPatch(source: string, patch: string): string | false;
}
