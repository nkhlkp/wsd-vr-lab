// Talks to the serverless functions in web/api (same origin; the session is an httpOnly cookie).

/** VITE_DEMO=1 builds an open demo with no login: records stay in the browser. */
export const DEMO = import.meta.env.VITE_DEMO === '1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Server error (${res.status}).`)
  return data as T
}
