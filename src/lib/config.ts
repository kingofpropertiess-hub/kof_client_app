/**
 * API configuration.
 *
 * How the API URL is resolved (in priority order):
 *
 * 1. `global.__API_BASE_URL__` — set this at the very top of index.js (or via
 *    a debugger/DevTools) to override everything at runtime:
 *      global.__API_BASE_URL__ = "http://192.168.1.5:5001/api";
 * 2. `PRODUCTION_API_BASE_URL` below (baked in for release builds).
 * 3. Development defaults:
 *      - Android emulator: http://10.0.2.2:5001/api  (10.0.2.2 is the host loopback from inside the emulator)
 *      - Other platforms:  http://localhost:5001/api
 *
 * NOTE: "localhost" on a physical Android device is the device itself, NOT your computer.
 * Start the backend with: cd backend/kingofproperties_backend && npm run dev  (default PORT 5000,
 * this client expects 5001 — keep them in sync).
 */
import { Platform } from "react-native";

const BACKEND_PORT = "5001";

/**
 * Deployed API base. When set it is used by both debug and release builds.
 * Leave empty to fall back to the development defaults (localhost / 10.0.2.2).
 */
const PRODUCTION_API_BASE_URL = "https://kingofproperties-backend-five.vercel.app/api";

function resolve(): string {
  // Runtime override. Set it at the very top of index.js, e.g.
  //   global.__API_BASE_URL__ = "http://192.168.1.5:5001/api";
  const explicit = (global as any).__API_BASE_URL__;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim().replace(/\/$/, "");
  }

  if (PRODUCTION_API_BASE_URL.trim().length > 0) {
    return PRODUCTION_API_BASE_URL.trim().replace(/\/$/, "");
  }

  if (__DEV__) {
    if (Platform.OS === "android") {
      // 10.0.2.2 = host machine loopback from the Android emulator. On a real
      // Android device set global.__API_BASE_URL__ to your computer's LAN IP.
      return `http://10.0.2.2:${BACKEND_PORT}/api`;
    }
    return `http://localhost:${BACKEND_PORT}/api`;
  }

  console.warn(
    "[config] No production API URL configured. Set PRODUCTION_API_BASE_URL in src/lib/config.ts."
  );
  return `http://localhost:${BACKEND_PORT}/api`;
}

export const API_BASE_URL = resolve();

/** Upstream asset helper: Cloudinary URLs are absolute; /uploads are relative to the backend. */
export function resolveImageUrl(url?: string | null, fallbackImage?: string): string {
  if (!url) return fallbackImage || "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads")) {
    const origin = API_BASE_URL.replace(/\/api$/, "");
    return `${origin}${url}`;
  }
  return url;
}

/** Default read timeout. Auth calls override with a longer window (cold Vercel starts). */
export const REQUEST_TIMEOUT_MS = 90000;

/** Cold-start tolerance for auth (register/login) — first hit on a sleeping server can take a while. */
export const AUTH_TIMEOUT_MS = 75000;
