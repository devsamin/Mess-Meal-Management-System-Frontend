/** Browser-side API client. All calls go through the same-origin /api/backend proxy. */

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  data: unknown;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, data?: unknown) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.data = data;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const m = firstMessage(v);
      if (m) return m;
    }
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      const m = firstMessage(v);
      if (m) return m;
    }
  }
  return null;
}

/** Turn a DRF error body into a readable message plus per-field messages. */
export function parseError(status: number, data: unknown): ApiError {
  const fieldErrors: Record<string, string> = {};
  let message: string | null = null;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const m = firstMessage(val);
      if (!m) continue;
      if (key === "detail" || key === "non_field_errors") message ??= m;
      else fieldErrors[key] = m;
    }
    message ??= Object.values(fieldErrors)[0] ?? null;
  } else {
    message = firstMessage(data);
  }
  if (!message) {
    message =
      status === 403
        ? "You don't have permission to do this."
        : status === 404
          ? "Not found."
          : status >= 500
            ? "Server error. Please try again."
            : "Something went wrong.";
  }
  return new ApiError(status, message, fieldErrors, data);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const init: RequestInit = { method: opts.method ?? "GET", signal: opts.signal, headers: { Accept: "application/json" } };
  if (opts.json !== undefined) {
    init.body = JSON.stringify(opts.json);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  } else if (opts.form) {
    init.body = opts.form;
  }

  let res: Response;
  try {
    res = await fetch(`/api/backend/${clean}${buildQuery(opts.query)}`, init);
  } catch {
    throw new ApiError(0, "Network error. Check your connection.");
  }

  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Hard navigation on purpose: a full reload drops all cached data from the ended session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${next}`;
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw parseError(res.status, data);
  return data as T;
}

/** URL for file downloads (exports) — same-origin, so the session cookie is sent. */
export function backendUrl(path: string, query?: Query) {
  return `/api/backend/${path.replace(/^\/+|\/+$/g, "")}${buildQuery(query)}`;
}

/** Media files (receipts, photos) are served by Django under /media; route them through the proxy. */
export function mediaUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url, "http://x");
    return u.pathname.startsWith("/media/") ? `/api/backend${u.pathname}` : url;
  } catch {
    return url;
  }
}

/** Build multipart form data, skipping undefined values. */
export function toFormData(values: Record<string, unknown>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue;
    if (v instanceof Blob) fd.append(k, v);
    else if (v === null) fd.append(k, "");
    else fd.append(k, String(v));
  }
  return fd;
}

/** Field-level message from a failed mutation, for inline form errors. */
export function fieldError(err: unknown, name: string): string | undefined {
  return err instanceof ApiError ? err.fieldErrors[name] : undefined;
}
