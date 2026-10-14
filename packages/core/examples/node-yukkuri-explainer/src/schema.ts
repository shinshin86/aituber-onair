import { LINE_EMOTIONS, type ExplainerScript } from './types.js';

type RecordValue = Record<string, unknown>;
function isObject(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reject malformed scripts before synthesizing any audio. */
export function parseScript(raw: string): ExplainerScript {
  const script: unknown = JSON.parse(raw);
  if (!isObject(script)) throw new Error('Script must be an object.');
  const errors: string[] = [];
  const string = (value: unknown, key: string, max = 120) => {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      Array.from(value).length > max
    )
      errors.push(
        `${key} must be a non-empty string (at most ${max} characters).`,
      );
  };
  const duration = (value: unknown, key: string, positive = false) => {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      (positive && value === 0)
    )
      errors.push(
        `${key} must be a finite ${positive ? 'positive' : 'non-negative'} number.`,
      );
  };
  const speakers = isObject(script.speakers) ? script.speakers : {};
  if (Object.keys(speakers).length !== 2)
    errors.push('speakers must contain exactly two speakers.');
  const positions = new Set<string>();
  for (const [id, speaker] of Object.entries(speakers)) {
    const key = `speakers.${id}`;
    if (!isObject(speaker)) {
      errors.push(`${key} must be an object.`);
      continue;
    }
    string(speaker.name, `${key}.name`, 16);
    string(speaker.image, `${key}.image`, 4096);
    if (!['left', 'right'].includes(String(speaker.position)))
      errors.push(`${key}.position must be left or right.`);
    positions.add(String(speaker.position));
    if (
      typeof speaker.subtitleColor !== 'string' ||
      !/^#[\da-fA-F]{6}$/.test(speaker.subtitleColor)
    )
      errors.push(`${key}.subtitleColor must be a six-digit hex color.`);
    if (speaker.mirror !== undefined && typeof speaker.mirror !== 'boolean')
      errors.push(`${key}.mirror must be a boolean.`);
    const voice = speaker.voice;
    if (
      !isObject(voice) ||
      !['sine', 'aituber-voice'].includes(String(voice.engine))
    ) {
      errors.push(`${key}.voice.engine must be sine or aituber-voice.`);
    } else {
      if (voice.options !== undefined && !isObject(voice.options))
        errors.push(`${key}.voice.options must be an object.`);
      if (
        voice.engine === 'aituber-voice' &&
        (!isObject(voice.options) ||
          typeof voice.options.engineType !== 'string')
      )
        errors.push(`${key}.voice.options.engineType is required.`);
      if (voice.engine === 'sine' && isObject(voice.options)) {
        for (const option of [
          'frequency',
          'secondsPerChar',
          'minDuration',
          'amplitude',
        ]) {
          if (voice.options[option] !== undefined)
            duration(
              voice.options[option],
              `${key}.voice.options.${option}`,
              option !== 'amplitude',
            );
        }
        if (Number(voice.options.amplitude) > 1)
          errors.push(`${key}.voice.options.amplitude must be at most 1.`);
      }
    }
  }
  if (positions.size !== 2)
    errors.push('Speakers must occupy different positions (left and right).');
  if (script.show !== undefined) {
    if (!isObject(script.show)) errors.push('show must be an object.');
    else
      for (const key of ['title', 'subtitle'])
        if (script.show[key] !== undefined)
          string(script.show[key], `show.${key}`, 48);
  }
  if (script.output !== undefined) string(script.output, 'output', 4096);
  if (
    script.seed !== undefined &&
    (typeof script.seed !== 'number' || !Number.isFinite(script.seed))
  )
    errors.push('seed must be finite.');
  for (const key of ['leadIn', 'leadOut', 'defaultPauseAfter'])
    if (script[key] !== undefined) duration(script[key], key);
  if (!Array.isArray(script.lines) || !script.lines.length)
    errors.push('lines must be a non-empty array.');
  else
    script.lines.forEach((line: unknown, index) => {
      const key = `lines[${index}]`;
      if (!isObject(line)) {
        errors.push(`${key} must be an object.`);
        return;
      }
      if (
        typeof line.speaker !== 'string' ||
        !Object.hasOwn(speakers, line.speaker)
      )
        errors.push(
          `${key}.speaker: unknown speaker "${String(line.speaker)}".`,
        );
      string(line.text, `${key}.text`, 100);
      for (const field of ['reading', 'chapter', 'point'])
        if (line[field] !== undefined)
          string(
            line[field],
            `${key}.${field}`,
            field === 'reading' ? 1000 : 60,
          );
      if (
        line.keywords !== undefined &&
        (!Array.isArray(line.keywords) ||
          line.keywords.length > 3 ||
          line.keywords.some(
            (v) =>
              typeof v !== 'string' || !v.trim() || Array.from(v).length > 12,
          ))
      )
        errors.push(
          `${key}.keywords must contain at most three strings of 1–12 characters.`,
        );
      if (
        line.emotion !== undefined &&
        !LINE_EMOTIONS.includes(line.emotion as never)
      )
        errors.push(`${key}.emotion is not supported.`);
      if (line.spoken !== undefined && typeof line.spoken !== 'boolean')
        errors.push(`${key}.spoken must be a boolean.`);
      if (line.duration !== undefined || line.spoken === false)
        duration(line.duration, `${key}.duration`, true);
      if (line.pauseAfter !== undefined)
        duration(line.pauseAfter, `${key}.pauseAfter`);
      if (line.slide !== undefined) {
        if (
          !isObject(line.slide) ||
          Object.keys(line.slide).length !== 1 ||
          (!Object.hasOwn(line.slide, 'text') &&
            !Object.hasOwn(line.slide, 'image'))
        )
          errors.push(`${key}.slide must be {text: string} or {image: path}.`);
        else if (Object.hasOwn(line.slide, 'text'))
          string(line.slide.text, `${key}.slide.text`, 100);
        else string(line.slide.image, `${key}.slide.image`, 4096);
      }
    });
  if (errors.length)
    throw new Error(`Invalid yukkuri script:\n- ${errors.join('\n- ')}`);
  return script as unknown as ExplainerScript;
}
