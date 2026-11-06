import { useState } from 'react';
import {
  type CatalogLocale,
  acknowledgeOpenRouterModel,
  catalogMessages,
  formatCatalogError,
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
  locale = 'en',
}: {
  value: string;
  onChange: (id: string) => void;
  curatedModels: readonly CuratedModel[];
  disabled?: boolean;
  legacyModels?: readonly string[];
  /** UI language; samples pass the language of their surrounding UI. */
  locale?: CatalogLocale;
}) {
  const t = catalogMessages[locale];
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
  const blockReason = getOpenRouterRequestBlockReason(value, locale);
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
      ? t.unverified
      : price === 'zero'
        ? t.zero
        : price === 'paid'
          ? t.paid
          : t.unknown;
  return (
    <div className="openrouter-catalog">
      <p className="openrouter-catalog-note">{t.note}</p>
      <div className="openrouter-catalog-status-row">
        <output
          className="openrouter-catalog-status"
          data-status={catalog.status}
          aria-live="polite"
        >
          {catalog.status === 'loading' && t.loading}
          {catalog.error &&
            `${formatCatalogError(catalog.error, locale)}${t.errorSuffix}`}
          {catalog.stale && t.stale}
          {!authoritative && t.fallback}
          {catalog.updatedAt !== null &&
            t.lastUpdated(new Date(catalog.updatedAt).toLocaleString())}
        </output>
        <button
          type="button"
          className="openrouter-catalog-refresh"
          disabled={disabled || catalog.status === 'loading'}
          onClick={() => void catalog.refresh()}
        >
          {t.refresh}
        </button>
      </div>
      <div className="openrouter-catalog-filters">
        <label>
          {t.search}{' '}
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          {t.priceFilter}{' '}
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            disabled={disabled}
          >
            <option value="all">{t.allPrices}</option>
            <option value="zero">{t.zero}</option>
            <option value="paid">{t.paid}</option>
            <option value="unknown">{t.unknown}</option>
          </select>
        </label>
      </div>
      <div className="openrouter-catalog-selected">
        <p className="openrouter-catalog-selected-model">
          {t.selected}
          <code>{value}</code>
          {selected
            ? ` — ${label(selected.priceClass)}`
            : authoritative
              ? t.missing
              : t.unverifiedSaved}
        </p>
        {selectedMetadata && (
          <p className="openrouter-catalog-metadata">
            {t.metadata(
              formatCatalogPricing(selectedMetadata, locale),
              String(selectedMetadata.contextLength ?? t.unknownValue),
              selectedMetadata.inputModalities.join(', '),
              selectedMetadata.supportedParameters.join(', ') || t.unknownValue,
            )}
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
              {t.acknowledge(value)}
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
      {!visible.length && <p className="openrouter-catalog-empty">{t.empty}</p>}
      <small className="openrouter-catalog-footnote">{t.footnote}</small>
    </div>
  );
}
