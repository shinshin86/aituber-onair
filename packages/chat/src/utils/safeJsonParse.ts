export type JsonParseErrorHandler = (payload: string, error: unknown) => void;

export const safeJsonParse = <T>(
  payload: string,
  fallback: T,
  onJsonError?: JsonParseErrorHandler,
): T => {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    onJsonError?.(payload, error);
    return fallback;
  }
};

export const safeParseToolCallInput = (
  payload: string | undefined,
  onJsonError?: JsonParseErrorHandler,
): any => {
  if (!payload) {
    return {};
  }

  return safeJsonParse(payload, {}, onJsonError);
};
