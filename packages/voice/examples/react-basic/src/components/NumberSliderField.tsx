import type { ChangeEvent } from 'react';
import type { SliderConfig } from '../constants';

export interface NumberSliderFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  config: SliderConfig;
  placeholder?: string;
  suffix?: string;
}

export const DEFAULT_VALUE_LABEL = '既定値';

export const clampValue = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const getDecimalPlaces = (step: number): number => {
  const stepString = step.toString();
  if (!stepString.includes('.')) {
    return 0;
  }
  return stepString.split('.')[1]?.length ?? 0;
};

export const formatValueForStep = (value: number, step: number): string => {
  const decimals = getDecimalPlaces(step);
  return decimals > 0 ? value.toFixed(decimals) : value.toString();
};

export function NumberSliderField({
  id,
  label,
  value,
  onChange,
  config,
  placeholder,
  suffix,
}: NumberSliderFieldProps) {
  const effectiveSuffix = suffix ?? config.suffix ?? '';
  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  const hasCustomValue = trimmedValue !== '' && !Number.isNaN(numericValue);
  const sliderValue = clampValue(
    hasCustomValue ? numericValue : config.defaultValue,
    config.min,
    config.max,
  );

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextNumericValue = Number.parseFloat(event.target.value);
    if (Number.isNaN(nextNumericValue)) {
      onChange('');
      return;
    }
    onChange(formatValueForStep(nextNumericValue, config.step));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleReset = () => {
    onChange('');
  };

  const displayValue = !hasCustomValue
    ? `${DEFAULT_VALUE_LABEL} (${formatValueForStep(
        config.defaultValue,
        config.step,
      )}${effectiveSuffix})`
    : `${trimmedValue}${effectiveSuffix}`;

  return (
    <div className="form-group form-group--with-slider">
      <div className="form-group__label-row">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="slider-reset"
          onClick={handleReset}
          disabled={!hasCustomValue}
        >
          既定値に戻す
        </button>
      </div>
      <div className="range-control">
        <input
          id={`${id}Slider`}
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={sliderValue}
          onChange={handleSliderChange}
          aria-label={`${label} スライダー`}
          list={`${id}Ticks`}
        />
        <output className="range-control__value" htmlFor={`${id}Slider`}>
          {displayValue}
        </output>
      </div>
      <input
        id={id}
        type="number"
        step={config.step}
        value={value}
        onChange={handleNumberChange}
        placeholder={placeholder}
      />
      <datalist id={`${id}Ticks`}>
        <option value={config.min} />
        <option value={config.defaultValue} />
        <option value={config.max} />
      </datalist>
    </div>
  );
}
