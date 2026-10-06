/** Sample UI metadata only. Never changes the SDK's supported model registry. */
export const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
export const CACHE_KEY = 'aituber-openrouter-catalog-v1';
export const APPROVAL_KEY = 'aituber-openrouter-price-approvals-v1';
export const TTL_MS = 5 * 60 * 1000;
export const TIMEOUT_MS = 10_000;
export type PriceClass = 'zero' | 'paid' | 'unknown';
export type CatalogLocale = 'en' | 'ja';
/** User-facing catalog text. Samples choose the locale matching their UI. */
export const catalogMessages = {
  en: {
    note: 'OpenRouter catalog metadata only. Availability, account access, quotas, routing and actual charges can vary. Advanced features remain limited by the SDK.',
    loading: 'Loading catalog… ',
    errorSuffix: '. ',
    stale: 'Showing stale last-good metadata. ',
    fallback: 'Using unverified curated fallback IDs. ',
    lastUpdated: (time: string) => `Last updated: ${time}`,
    refresh: 'Refresh catalog',
    search: 'Search OpenRouter models',
    priceFilter: 'Published price',
    allPrices: 'All prices',
    zero: 'Zero published price',
    paid: 'Paid',
    unknown: 'Price unknown',
    unverified: 'Unverified fallback',
    selected: 'Selected: ',
    missing: ' — Missing from catalog',
    unverifiedSaved: ' — Unverified saved ID',
    metadata: (
      pricing: string,
      context: string,
      input: string,
      params: string,
    ) =>
      `${pricing}. Context: ${context}. Input: ${input}; output: text. Parameters: ${params}. These are published metadata, not tested capability claims.`,
    acknowledge: (id: string) => `Acknowledge current pricing for ${id}`,
    empty: 'No models match these filters. Your selected ID is unchanged.',
    footnote:
      'Zero published price is not a promise of free inference. SDK defaults, including maxTokens 5000 when response length is omitted and reasoning.exclude=true, still apply; per-model limits can reject requests.',
    blockMissing:
      'The selected model is absent from the latest available catalog. Select a listed model before sending.',
    blockPriceChanged:
      'Pricing metadata changed for this model. Review its current price label and acknowledge it before sending.',
    pricingUnknown: 'Pricing unknown',
    unknownValue: 'unknown',
    unitToken: 'token',
    unitRequest: 'request',
    unitImage: 'image',
    unitCatalogDefined: 'catalog-defined unit',
    pricingEntry: (key: string, amount: string, unit: string) =>
      `${key}: ${amount} USD/${unit} (published)`,
    pricingSeparator: '; ',
    errorTimeout: 'Catalog request timed out',
    errorInvalid: 'Invalid model catalog response',
    errorDuplicate: 'Duplicate model ID in catalog',
    errorStatus: (status: string) => `Catalog request failed (${status})`,
    errorFailed: 'Catalog request failed',
    errorOther: (detail: string) => detail,
  },
  ja: {
    note: 'OpenRouterの公開カタログの情報です。実際に使えるか、アカウントの権限、利用上限、ルーティング、実際の請求額は異なる場合があります。高度な機能はSDKの対応範囲に限られます。',
    loading: 'カタログを読み込み中… ',
    errorSuffix: '。',
    stale: '前回取得した情報を表示しています（最新でない可能性があります）。',
    fallback: '未検証の候補IDを表示しています。',
    lastUpdated: (time: string) => `最終更新: ${time}`,
    refresh: 'カタログを更新',
    search: 'OpenRouterのモデルを検索',
    priceFilter: '公開価格',
    allPrices: 'すべての価格',
    zero: '公開価格ゼロ',
    paid: '有料',
    unknown: '価格不明',
    unverified: '未検証の候補',
    selected: '選択中: ',
    missing: ' — カタログにありません',
    unverifiedSaved: ' — 未検証の保存済みID',
    metadata: (
      pricing: string,
      context: string,
      input: string,
      params: string,
    ) =>
      `${pricing}。コンテキスト長: ${context}。入力: ${input}、出力: text。パラメーター: ${params}。いずれも公開されている情報で、動作を検証したものではありません。`,
    acknowledge: (id: string) => `${id} の現在の価格を確認して承認`,
    empty: '条件に一致するモデルがありません。選択中のIDは変わりません。',
    footnote:
      '公開価格が0でも、無料で推論できるとは限りません。応答の長さを指定しないときのmaxTokens 5000やreasoning.exclude=trueなど、SDKの既定値はそのまま適用されます。モデルごとの制限でリクエストが拒否されることがあります。',
    blockMissing:
      '選択中のモデルが最新のカタログにありません。一覧にあるモデルを選んでから送信してください。',
    blockPriceChanged:
      'このモデルの価格情報が変わりました。現在の価格表示を確認して承認してから送信してください。',
    pricingUnknown: '価格不明',
    unknownValue: '不明',
    unitToken: 'トークン',
    unitRequest: 'リクエスト',
    unitImage: '画像',
    unitCatalogDefined: 'カタログで定義された単位',
    pricingEntry: (key: string, amount: string, unit: string) =>
      `${key}: ${amount} USD/${unit}（公開値）`,
    pricingSeparator: '、',
    errorTimeout: 'カタログの取得がタイムアウトしました',
    errorInvalid: 'カタログの応答形式が正しくありません',
    errorDuplicate: 'カタログに重複したモデルIDがあります',
    errorStatus: (status: string) =>
      `カタログの取得に失敗しました（${status}）`,
    errorFailed: 'カタログの取得に失敗しました',
    errorOther: (detail: string) => `カタログの取得に失敗しました（${detail}）`,
  },
} as const;
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
  locale: CatalogLocale = 'en',
): string | null {
  if (snapshot.updatedAt === null) return null; // Curated/legacy fallback is explicitly unverified.
  const model = snapshot.models.find((entry) => entry.id === modelId);
  if (!model) return catalogMessages[locale].blockMissing;
  if (approvals[modelId] !== model.pricingFingerprint)
    return catalogMessages[locale].blockPriceChanged;
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
export function formatCatalogPricing(
  model: CatalogModel,
  locale: CatalogLocale = 'en',
): string {
  const messages = catalogMessages[locale];
  const entries = Object.entries(model.pricing);
  if (!entries.length) return messages.pricingUnknown;
  return entries
    .map(([key, value]) => {
      const amount =
        typeof value === 'string' || typeof value === 'number'
          ? String(value) || messages.unknownValue
          : messages.unknownValue;
      const unit =
        key === 'prompt' ||
        key === 'completion' ||
        key === 'input_cache_read' ||
        key === 'input_cache_write'
          ? messages.unitToken
          : key === 'request'
            ? messages.unitRequest
            : key === 'image'
              ? messages.unitImage
              : messages.unitCatalogDefined;
      return messages.pricingEntry(key, amount, unit);
    })
    .join(messages.pricingSeparator);
}

/** Translate the catalog's English error messages for display. */
export function formatCatalogError(
  error: string,
  locale: CatalogLocale = 'en',
): string {
  if (locale === 'en') return error;
  const messages = catalogMessages[locale];
  if (error === 'Catalog request timed out') return messages.errorTimeout;
  if (error === 'Invalid model catalog response') return messages.errorInvalid;
  if (error === 'Duplicate model ID in catalog') return messages.errorDuplicate;
  const status = /^Catalog request failed \((\d+)\)$/.exec(error)?.[1];
  if (status) return messages.errorStatus(status);
  if (error === 'Catalog request failed') return messages.errorFailed;
  return messages.errorOther(error);
}
