import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";

export const BASE = API_BASE_URL;

let tokenGetter: () => string | null = () => null;
let onUnauthorized: (() => void) | null = null;

export function setTokenProvider(fn: () => string | null) {
  tokenGetter = fn;
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetwork: boolean;
  constructor(message: string, status = 0, data: unknown = null, isNetwork = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.isNetwork = isNetwork;
  }
}

interface Opts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  auth?: boolean; // send bearer token (default: true when available)
  skipGuard?: boolean; // do not trigger global 401 handler
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function safeStringify(body: unknown): string | FormData | undefined {
  if (body === undefined) return undefined;
  // React Native fetch needs the FormData passed as-is (boundary header set by RN).
  if (isFormData(body)) return body;
  return JSON.stringify(body);
}

export async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS, skipGuard = false } = opts;

  // Emulators can drop a connection right after a radio/Wi-Fi switch; one quick
  // retry on a *network-class* failure (request never completed) fixes it.
  const attempt = async (): Promise<T> => coreRequest<T>(path, { ...opts, method, body, timeoutMs, skipGuard });
  try {
    return await attempt();
  } catch (e: unknown) {
    const isNetworkErr = e instanceof ApiError && e.isNetwork;
    if (!isNetworkErr) throw e;
    await new Promise(r => setTimeout(r, 1200));
    return attempt();
  }
}

async function coreRequest<T>(path: string, opts: Opts): Promise<T> {
  const { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS, skipGuard = false } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined && !isFormData(body)) headers["Content-Type"] = "application/json";

  const token = tokenGetter();
  if (token && opts.auth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: safeStringify(body),
      signal: controller.signal,
      credentials: "include",
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { _raw: text };
    }

    if (!res.ok) {
      const errData = (data || {}) as { message?: string; error?: string };
      const message = errData.message || errData.error || `Request failed (${res.status})`;
      const err = new ApiError(message, res.status, data);
      if (res.status === 401 && !skipGuard && onUnauthorized) {
        setTimeout(() => onUnauthorized?.(), 0);
      }
      throw err;
    }
    return data as T;
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    const err = e as { name?: string; message?: string };
    if (err?.name === "AbortError") {
      throw new ApiError("The request took too long. Please check your connection and try again.", 0, null, true);
    }
    throw new ApiError(
      `Could not reach the King of Properties server (${err?.message || "network error"}). Check your internet and retry.`,
      0,
      null,
      true
    );
  } finally {
    clearTimeout(timer);
  }
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body });
export const patch = <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body });
export const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body });
export const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const API_URL = API_BASE_URL;