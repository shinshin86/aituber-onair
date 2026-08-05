let correlationSequence = 0;

export function createCorrelationId(prefix: string): string {
  correlationSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${correlationSequence.toString(36)}`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}
