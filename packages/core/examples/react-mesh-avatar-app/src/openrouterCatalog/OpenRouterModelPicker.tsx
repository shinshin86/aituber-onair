import { useState } from 'react';
import {
  acknowledgeOpenRouterModel,
  formatCatalogPricing,
  getLegacyOpenRouterModels,
  getOpenRouterRequestBlockReason,
} from './catalog';
import { useOpenRouterCatalog } from './useOpenRouterCatalog';

export interface CuratedModel {
  id: string;
  name?: string;
}
export function OpenRouterModelPicker({
  value,
  onChange,
  curatedModels,
  legacyModels = [],
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  curatedModels: readonly CuratedModel[];
  disabled?: boolean;
  legacyModels?: readonly string[];
}) {
  const catalog = useOpenRouterCatalog();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const authoritative = catalog.updatedAt !== null;
  const fallback = [
    ...new Map(
      [
        ...curatedModels,
        ...getLegacyOpenRouterModels(),
        ...legacyModels.map((id) => ({ id, name: id })),
      ].map((model) => [model.id, model]),
    ).values(),
  ];
  const models = authoritative
    ? catalog.models
    : fallback.map((model) => ({
        ...model,
        name: model.name || model.id,
        priceClass: 'unknown' as const,
      }));
  const selected = models.find((model) => model.id === value);
  const selectedMetadata = catalog.models.find((model) => model.id === value);
  const blockReason = getOpenRouterRequestBlockReason(value);
  const visible = models.filter(
    (model) =>
      (group === 'all' || model.priceClass === group) &&
      `${model.id} ${model.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const select = (id: string) => {
    acknowledgeOpenRouterModel(id);
    onChange(id);
  };
  const label = (price: string) =>
    !authoritative
      ? 'Unverified fallback'
      : price === 'zero'
        ? 'Zero published price'
        : price === 'paid'
          ? 'Paid'
          : 'Price unknown';
  return (
    <div className="openrouter-catalog">
      <p className="openrouter-catalog-note">
        OpenRouter catalog metadata only. Availability, account access, quotas,
        routing and actual charges can vary. Advanced features remain limited by
        the SDK.
      </p>
      <div className="openrouter-catalog-status-row">
        <output
          className="openrouter-catalog-status"
          data-status={catalog.status}
          aria-live="polite"
        >
          {catalog.status === 'loading' && 'Loading catalog… '}
          {catalog.error && `${catalog.error}. `}
          {catalog.stale && 'Showing stale last-good metadata. '}
          {!authoritative && 'Using unverified curated fallback IDs. '}
          {catalog.updatedAt !== null &&
            `Last updated: ${new Date(catalog.updatedAt).toLocaleString()}`}
        </output>
        <button
          type="button"
          className="openrouter-catalog-refresh"
          disabled={disabled || catalog.status === 'loading'}
          onClick={() => void catalog.refresh()}
        >
          Refresh catalog
        </button>
      </div>
      <div className="openrouter-catalog-filters">
        <label>
          Search OpenRouter models{' '}
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          Published price{' '}
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            disabled={disabled}
          >
            <option value="all">All prices</option>
            <option value="zero">Zero published price</option>
            <option value="paid">Paid</option>
            <option value="unknown">Price unknown</option>
          </select>
        </label>
      </div>
      <div className="openrouter-catalog-selected">
        <p className="openrouter-catalog-selected-model">
          Selected: <code>{value}</code>
          {selected
            ? ` — ${label(selected.priceClass)}`
            : authoritative
              ? ' — Missing from catalog'
              : ' — Unverified saved ID'}
        </p>
        {selectedMetadata && (
          <p className="openrouter-catalog-metadata">
            {formatCatalogPricing(selectedMetadata)}. Context:{' '}
            {selectedMetadata.contextLength ?? 'unknown'}. Input:{' '}
            {selectedMetadata.inputModalities.join(', ')}; output: text.
            Parameters:{' '}
            {selectedMetadata.supportedParameters.join(', ') || 'unknown'}.
            These are published metadata, not tested capability claims.
          </p>
        )}
      </div>
      {blockReason && (
        <div className="openrouter-catalog-alert" role="alert">
          <p>{blockReason}</p>
          {selected && (
            <button
              type="button"
              className="openrouter-catalog-acknowledge"
              disabled={disabled}
              onClick={() => select(value)}
            >
              Acknowledge current pricing for {value}
            </button>
          )}
        </div>
      )}
      <div className="model-list openrouter-catalog-list">
        {visible.map((model) => (
          <button
            type="button"
            key={model.id}
            className={`model-item ${value === model.id ? 'selected active' : ''}`}
            aria-pressed={value === model.id}
            disabled={disabled}
            onClick={() => select(model.id)}
          >
            <span className="model-name">{model.name}</span>{' '}
            <span className="model-id">{model.id}</span>{' '}
            <span className="model-price">{label(model.priceClass)}</span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="openrouter-catalog-empty">
          No models match these filters. Your selected ID is unchanged.
        </p>
      )}
      <small className="openrouter-catalog-footnote">
        Zero published price is not a promise of free inference. SDK defaults,
        including maxTokens 5000 when response length is omitted and
        reasoning.exclude=true, still apply; per-model limits can reject
        requests.
      </small>
    </div>
  );
}
