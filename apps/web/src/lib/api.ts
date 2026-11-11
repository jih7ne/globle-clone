import type {
  ApiErrorCode,
  FeedbackRequest,
  FinishResponse,
  GuessResponse,
  StartRequest,
  StartResponse,
} from '@gw/shared';

/** The API answered with an error code. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}

/** The API could not be reached (offline, DNS, server down). */
export class NetworkError extends Error {}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(String(err));
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (data as { error?: ApiErrorCode } | null)?.error;
    if (code) throw new ApiError(code, res.status);
    throw new NetworkError(`HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  start: (req: StartRequest) => post<StartResponse>('start', req),
  guess: (token: string, iso3: string) => post<GuessResponse>('guess', { token, iso3 }),
  finish: (token: string) => post<FinishResponse>('finish', { token }),
  feedback: (req: FeedbackRequest) => post<{ ok: true }>('feedback', req),
};
