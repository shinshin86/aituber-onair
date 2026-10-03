/** Sample UI metadata only. Never changes the SDK's supported model registry. */
export const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
export const CACHE_KEY = 'aituber-openrouter-catalog-v1';
export const APPROVAL_KEY = 'aituber-openrouter-price-approvals-v1';
export const TTL_MS = 5 * 60 * 1000;
export const TIMEOUT_MS = 10_000;
export type PriceClass = 'zero' | 'paid' | 'unknown';
export interface CatalogModel {
  id: string;
  name: string;
  priceClass: PriceClass;
  pricingFingerprint: string;
  inputModalities: string[];
  supportedParameters: string[];
  contextLength?: number;
  pricing: Record<string, unknown>;
  supportedEfforts: string[];
}
export interface CatalogSnapshot {
  models: CatalogModel[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  updatedAt: number | null;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}
// Preserve raw values (including unknown future fields), never round for approval.
function fingerprint(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]]),
  );
}
export function classifyPricing(value: unknown): PriceClass {
  if (!record(value) || !('prompt' in value) || !('completion' in value))
    return 'unknown';
  const prices = Object.values(value).map((v) => {
    if (typeof v !== 'number' && typeof v !== 'string') return Number.NaN;
    if (
      typeof v === 'string' &&
      !/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim())
    )
      return Number.NaN;
    const parsed = Number(v);
    // A positive decimal must never become a zero-price label via underflow.
    if (
      typeof v === 'string' &&
      parsed === 0 &&
      /[1-9]/.test(v.trim().split(/[eE]/)[0])
    )
      return Number.NaN;
    return parsed;
  });
  if (!prices.length || prices.some((v) => !Number.isFinite(v) || v < 0))
    return 'unknown';
  return prices.every((v) => v === 0) ? 'zero' : 'paid';
}
export function parseCatalog(payload: unknown): CatalogModel[] {
  if (!record(payload) || !Array.isArray(payload.data))
    throw new Error('Invalid model catalog response');
  const models = new Map<string, CatalogModel>();
  let validRecords = 0;
  for (const item of payload.data) {
    if (
      !record(item) ||
      typeof item.id !== 'string' ||
      !item.id.trim() ||
      !record(item.architecture)
    )
      continue;
    if (
      !Array.isArray(item.architecture.input_modalities) ||
      !item.architecture.input_modalities.every(
        (v: unknown) => typeof v === 'string',
      ) ||
      !Array.isArray(item.architecture.output_modalities) ||
      !item.architecture.output_modalities.every(
        (v: unknown) => typeof v === 'string',
      )
    )
      continue;
    validRecords += 1;
    const input = strings(item.architecture.input_modalities);
    const output = strings(item.architecture.output_modalities);
    if (!input.includes('text') || output.length !== 1 || output[0] !== 'text')
      continue;
    // Duplicate IDs are ambiguous; reject the response rather than choose a price.
    if (models.has(item.id)) throw new Error('Duplicate model ID in catalog');
    const pricing = record(item.pricing) ? item.pricing : {};
    models.set(item.id, {
      id: item.id,
      name:
        typeof item.name === 'string' && item.name.trim() ? item.name : item.id,
      priceClass: classifyPricing(pricing),
      pricingFingerprint: fingerprint(pricing),
      pricing,
      supportedEfforts: record(item.reasoning)
        ? strings(item.reasoning.supported_efforts)
        : [],
      inputModalities: input,
      supportedParameters: strings(item.supported_parameters),
      ...(typeof item.context_length === 'number' &&
      Number.isFinite(item.context_length) &&
      item.context_length > 0
        ? { contextLength: item.context_length }
        : {}),
    });
  }
  // A genuinely empty or non-chat-only catalog is valid; a broken schema is not.
  if (payload.data.length > 0 && validRecords === 0)
    throw new Error('Invalid model catalog response');
  return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
}
function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing / quota: retain session state. */
  }
}
function initialSnapshot(): CatalogSnapshot {
  const cached = readStorage(CACHE_KEY);
  if (
    record(cached) &&
    cached.version === 1 &&
    cached.endpoint === CATALOG_URL &&
    typeof cached.updatedAt === 'number' &&
    Number.isFinite(cached.updatedAt) &&
    cached.updatedAt > 0 &&
    cached.updatedAt <= Date.now()
  ) {
    try {
      return {
        models: parseCatalog(cached.payload),
        status: 'ready',
        error: null,
        updatedAt: cached.updatedAt,
      };
    } catch {
      /* Ignore malformed cache. */
    }
  }
  return { models: [], status: 'idle', error: null, updatedAt: null };
}
let snapshot = initialSnapshot();
const storedApprovals = readStorage(APPROVAL_KEY);
const approvals: Record<string, string> = Object.create(null);
if (
  record(storedApprovals) &&
  storedApprovals.version === 1 &&
  storedApprovals.endpoint === CATALOG_URL &&
  record(storedApprovals.prices)
) {
  for (const [id, value] of Object.entries(storedApprovals.prices))
    if (typeof value === 'string') approvals[id] = value;
}
function recordFirstPrices(models: CatalogModel[]): void {
  for (const model of models)
    if (!(model.id in approvals))
      approvals[model.id] =
        (model.id.endsWith(':free') || model.id === 'openrouter/free') &&
        model.priceClass !== 'zero'
          ? 'unverified-free-id'
          : model.pricingFingerprint;
  writeStorage(APPROVAL_KEY, {
    version: 1,
    endpoint: CATALOG_URL,
    prices: approvals,
  });
}
recordFirstPrices(snapshot.models);
const listeners = new Set<() => void>();
function emit(): void {
  for (const listener of listeners) listener();
}
export const getCatalogSnapshot = (): CatalogSnapshot => snapshot;
export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
let inFlight: Promise<void> | undefined;
export function refreshCatalog(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (
    !force &&
    snapshot.updatedAt !== null &&
    Date.now() - snapshot.updatedAt < TTL_MS
  )
    return Promise.resolve();
  snapshot = { ...snapshot, status: 'loading', error: null };
  emit();
  // Store-wide request survives component unmounts and React StrictMode remounts.
  inFlight = (async () => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Catalog request timed out'));
        }, TIMEOUT_MS);
      });
      const payload = await Promise.race([
        (async () => {
          const response = await fetch(CATALOG_URL, {
            method: 'GET',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: controller.signal,
          });
          if (!response.ok)
            throw new Error(`Catalog request failed (${response.status})`);
          return response.json() as Promise<unknown>;
        })(),
        timeout,
      ]);
      const models = parseCatalog(payload);
      const updatedAt = Date.now();
      recordFirstPrices(models);
      snapshot = { models, updatedAt, status: 'ready', error: null };
      writeStorage(CACHE_KEY, {
        version: 1,
        endpoint: CATALOG_URL,
        updatedAt,
        payload,
      });
    } catch (error) {
      snapshot = {
        ...snapshot,
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Catalog request failed',
      };
    } finally {
      clearTimeout(timer);
      inFlight = undefined;
      emit();
    }
  })();
  return inFlight;
}
export function getOpenRouterRequestBlockReason(
  modelId: string,
): string | null {
  if (snapshot.updatedAt === null) return null; // Curated/legacy fallback is explicitly unverified.
  const model = snapshot.models.find((entry) => entry.id === modelId);
  if (!model)
    return 'The selected model is absent from the latest available catalog. Select a listed model before sending.';
  if (approvals[modelId] !== model.pricingFingerprint)
    return 'Pricing metadata changed for this model. Review its current price label and acknowledge it before sending.';
  return null;
}
export function acknowledgeOpenRouterModel(modelId: string): void {
  const model = snapshot.models.find((entry) => entry.id === modelId);
  if (model) {
    approvals[modelId] = model.pricingFingerprint;
    writeStorage(APPROVAL_KEY, {
      version: 1,
      endpoint: CATALOG_URL,
      prices: approvals,
    });
    snapshot = { ...snapshot };
    emit();
  }
}
export function catalogSupportsVision(
  modelId: string,
  sdkSupportsVision: boolean,
): boolean {
  const model = snapshot.models.find((entry) => entry.id === modelId);
  return sdkSupportsVision && !!model?.inputModalities.includes('image');
}
export function catalogSupportsReasoning(
  modelId: string,
  sdkSupportsReasoning: boolean,
): boolean {
  const model = snapshot.models.find((entry) => entry.id === modelId);
  return (
    sdkSupportsReasoning &&
    !!model?.supportedParameters.includes('reasoning') &&
    !!model.supportedEfforts.length
  );
}
export function catalogSupportsTools(
  modelId: string,
  sdkSupportsTools: boolean,
): boolean {
  const model = snapshot.models.find((entry) => entry.id === modelId);
  return (
    sdkSupportsTools &&
    !!model?.supportedParameters.includes('tools') &&
    model.supportedParameters.includes('tool_choice')
  );
}

/** Read legacy cache IDs only; historical free labels/timestamps are not verification. */
export function getLegacyOpenRouterModels(): { id: string; name: string }[] {
  const root = readStorage('AITuberOnAirChat_example_react-basic');
  const settings =
    record(root) && record(root.openrouter)
      ? root.openrouter.dynamicFreeModels
      : null;
  const legacy =
    settings ?? readStorage('aituber-onair.openrouter.dynamicFreeModels');
  return migrateLegacyOpenRouterModels(legacy);
}
export function migrateLegacyOpenRouterModels(
  value: unknown,
): { id: string; name: string }[] {
  const models = Array.isArray(value)
    ? value
    : record(value)
      ? value.models
      : [];
  return [...new Set(strings(models).filter((id) => !!id.trim()))].map(
    (id) => ({ id, name: id }),
  );
}

export function catalogSupportedReasoningEfforts<T extends string>(
  modelId: string,
  sdkEfforts: readonly T[],
): T[] {
  const model = snapshot.models.find((entry) => entry.id === modelId);
  if (!model?.supportedParameters.includes('reasoning')) return [];
  return sdkEfforts.filter((effort) => model.supportedEfforts.includes(effort));
}
export function formatCatalogPricing(model: CatalogModel): string {
  const entries = Object.entries(model.pricing);
  if (!entries.length) return 'Pricing unknown';
  return entries
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'string' || typeof value === 'number' ? String(value) || 'unknown' : 'unknown'} USD/${key === 'prompt' || key === 'completion' || key === 'input_cache_read' || key === 'input_cache_write' ? 'token' : key === 'request' ? 'request' : key === 'image' ? 'image' : 'catalog-defined unit'} (published)`,
    )
    .join('; ');
}
