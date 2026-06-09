export const createJsonResponse = (
  status: number,
  body: unknown,
  init?: ResponseInit,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

export const createTextResponse = (
  status: number,
  body: string,
  init?: ResponseInit,
): Response =>
  new Response(body, {
    status,
    ...init,
  });
