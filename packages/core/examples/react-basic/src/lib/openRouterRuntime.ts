import {
  ChatServiceFactory,
  type ChatService,
  type ChatServiceProvider,
  type OpenRouterChatServiceOptions,
} from '@aituber-onair/core';
import {
  catalogSupportedReasoningEfforts,
  catalogSupportsTools,
  catalogSupportsVision,
  getOpenRouterRequestBlockReason,
} from '../openrouterCatalog/catalog';

const installedProviders = new WeakSet<object>();

function sdkSupportsVision(model: string): boolean {
  // The SDK vision helper can match substrings; a new catalog ID must not
  // inherit another model's capability merely because its name contains it.
  return (
    ChatServiceFactory.getSupportedModels('openrouter').includes(model) &&
    ChatServiceFactory.getVisionSupportLevelForModel('openrouter', model) ===
      'supported'
  );
}

export function getOpenRouterRuntimeBlockReason(
  provider: string,
  model: string,
  vision = false,
): string | null {
  if (provider !== 'openrouter') return null;
  const reason = getOpenRouterRequestBlockReason(model);
  if (reason) return reason;
  if (vision && !catalogSupportsVision(model, sdkSupportsVision(model))) {
    return 'Screen vision requires support from both the OpenRouter catalog and the installed SDK.';
  }
  return null;
}

/** Strip persisted options against current metadata before constructing the SDK. */
export function sanitizeOpenRouterOptions(
  options: OpenRouterChatServiceOptions,
  vision = false,
): OpenRouterChatServiceOptions {
  const model = options.model?.trim() || '';
  const visionModel = options.visionModel?.trim();
  const requestModel = vision ? visionModel || model : model;
  const knownModel =
    ChatServiceFactory.getSupportedModels('openrouter').includes(requestModel);
  const capabilities = ChatServiceFactory.getProviderCapabilities(
    'openrouter',
    requestModel,
  );
  const reasoningEfforts = catalogSupportedReasoningEfforts(
    requestModel,
    knownModel ? capabilities?.reasoningEffort || [] : [],
  );
  const tools = catalogSupportsTools(
    requestModel,
    knownModel && capabilities?.tools === true,
  );
  // Explicit allowlist: another provider's stale options never enter the SDK.
  return {
    apiKey: options.apiKey,
    model,
    endpoint: options.endpoint,
    responseLength: options.responseLength,
    appName: options.appName,
    appUrl: options.appUrl,
    ...(visionModel &&
    catalogSupportsVision(visionModel, sdkSupportsVision(visionModel))
      ? { visionModel }
      : {}),
    ...(tools ? { tools: options.tools } : {}),
    ...(options.reasoning_effort &&
    reasoningEfforts.includes(options.reasoning_effort)
      ? { reasoning_effort: options.reasoning_effort }
      : {}),
    // These samples do not expose reasoning output/token budgets. Do not let
    // stale options enable them without catalog-backed controls.
  };
}

function guardService(
  provider: ChatServiceProvider<OpenRouterChatServiceOptions>,
  options: OpenRouterChatServiceOptions,
): ChatService {
  const model = options.model?.trim() || '';
  const visionModel = options.visionModel?.trim() || model;
  let delegate: ChatService | undefined;
  let delegateOptions = '';
  const createForRequest = (vision = false) => {
    const reason = getOpenRouterRuntimeBlockReason(
      'openrouter',
      vision ? visionModel : model,
      vision,
    );
    if (reason) throw new Error(reason);
    // Recheck on every invocation, including subsequent tool-loop requests.
    // Keep the delegate when its options are unchanged so SDK free-tier rate
    // limiting counters and timestamps survive consecutive calls.
    const sanitized = sanitizeOpenRouterOptions(options, vision);
    const nextOptions = JSON.stringify(sanitized);
    if (!delegate || delegateOptions !== nextOptions) {
      delegate = provider.createChatService(sanitized);
      delegateOptions = nextOptions;
    }
    return delegate;
  };
  return {
    provider: 'openrouter',
    getModel: () => model,
    getVisionModel: () => visionModel,
    async processChat(...args) {
      return createForRequest().processChat(...args);
    },
    async processVisionChat(...args) {
      return createForRequest(true).processVisionChat(...args);
    },
    async chatOnce(...args) {
      return createForRequest().chatOnce(...args);
    },
    async visionChatOnce(...args) {
      return createForRequest(true).visionChatOnce(...args);
    },
  };
}

/**
 * Sample-local integration through the existing public provider registry.
 * Keeps SDK model lists unchanged; no fetch/prototype/private-field patches.
 * All Core and comment-analysis invocations share this guard. Metadata changes
 * cannot cancel an invocation already inside an SDK retry or rate-limit wait.
 */
export function installOpenRouterRuntimeGuard(): void {
  const provider = ChatServiceFactory.getProviders().get('openrouter') as
    | ChatServiceProvider<OpenRouterChatServiceOptions>
    | undefined;
  if (!provider || installedProviders.has(provider)) return;
  const guarded = new Proxy(provider, {
    get(target, property, receiver) {
      if (property === 'createChatService') {
        return (options: OpenRouterChatServiceOptions) =>
          guardService(target, options);
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  installedProviders.add(guarded);
  ChatServiceFactory.registerProvider(guarded);
}
