const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

// Global tick setter — will be wired to the store after initialization
let onTickReceived: ((tick: number) => void) | null = null;

export function setTickCallback(cb: (tick: number) => void) {
  onTickReceived = cb;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  // Capture simulation tick from every response
  const tick = response.headers.get('X-Sim-Tick');
  if (tick && onTickReceived) {
    onTickReceived(Number(tick));
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — ${path}`);
  }

  return response.json() as Promise<T>;
}

export const httpClient = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: 'GET', params }),
};
