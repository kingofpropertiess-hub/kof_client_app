/**
 * Lazy, crash-safe loader for the Google Sign-in native module.
 *
 * `@react-native-google-signin/google-signin` calls `TurboModuleRegistry.getEnforcing`
 * at import time, which throws an Invariant Violation when the native side isn't
 * present in the installed APK (e.g. a debug build made before the dependency was
 * linked). Importing this wrapper is always safe — `googleSignin` is `null` when
 * the native module is unavailable, and callers degrade gracefully.
 */

export interface GoogleSigninModuleShape {
  GoogleSignin: {
    configure: (opts: { webClientId: string; offlineAccess?: boolean }) => void;
    hasPlayServices: (opts?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
    // v13+ resolves { type: "success", data } | { type: "cancelled" }
    signIn: () => Promise<
      | { type: "success"; data: { idToken?: string | null; user: { id: string; email: string; givenName?: string | null; familyName?: string | null } } }
      | { type: "cancelled"; data?: undefined }
    >;
    signOut: () => Promise<boolean>;
    getCurrentUser: () => Promise<unknown>;
  };
  statusCodes: {
    SIGN_IN_CANCELLED: string | number;
    IN_PROGRESS: string | number;
    PLAY_SERVICES_NOT_AVAILABLE: string | number;
  };
  isErrorWithCode: (error: unknown) => boolean;
}

let loaded: GoogleSigninModuleShape | null = null;
try {
  const mod = require("@react-native-google-signin/google-signin");
  // The JS package can exist without its native counterpart — verify the shape.
  loaded = mod?.GoogleSignin ? (mod as GoogleSigninModuleShape) : null;
} catch {
  loaded = null;
}

export const googleSignin = loaded;
