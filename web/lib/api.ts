const SERVER_URL = process.env.API_URL ?? 'http://localhost:3001';
const CLIENT_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/** Error response from the API. `messages` holds the message(s) the API sent, ready to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join('\n'));
    this.name = 'ApiError';
  }
}

// The API (NestJS) answers errors with { message: string } for business rules
// and { message: string[] } for payload validation.
async function readErrorMessages(res: Response): Promise<string[]> {
  try {
    const { message } = await res.json();
    const messages = (Array.isArray(message) ? message : [message]).filter(
      (m): m is string => typeof m === 'string' && m.trim() !== '',
    );
    if (messages.length > 0) return messages;
  } catch {
    // body is not JSON (e.g. a proxy error page)
  }
  return [`Não foi possível concluir a operação (erro ${res.status}).`];
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CLIENT_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // fetch only rejects when there is no response at all (API offline, network down, CORS).
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', {
      cause: err,
    });
  }
  if (!res.ok) throw new ApiError(res.status, await readErrorMessages(res));
  return res.json();
}
