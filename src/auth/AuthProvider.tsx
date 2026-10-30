import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SecureStorage } from "../lib/secureStorage";
import { AuthApi, setTokenProvider, setUnauthorizedHandler } from "../lib/api";
import type { ApiUser } from "../lib/types";
import { googleSignin } from "./googleSignin";

const TOKEN_KEY = "kop_auth_token";
const USER_KEY = "kop_auth_user";
const GUEST_KEY = "kop_guest_mode";

// Web client ID from the Google Cloud project (same OAuth client the website
// uses). This is required on devices so the sign-in response returns an idToken
// that the backend can verify.
const GOOGLE_WEB_CLIENT_ID =
  "140325892562-5td20qc5upvq0tva81ojev5snif2hjv3.apps.googleusercontent.com";

// Google Sign-in is loaded lazily and safely: if the native module isn't in the
// installed APK (e.g. a debug build made before the dependency was linked), the
// app must still boot — only Google sign-in itself reports as unavailable.
googleSignin?.GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

type Status = "loading" | "authed" | "guest";

interface AuthCtx {
  status: Status;
  user: ApiUser | null;
  token: string | null;
  /** True when the user chose "Continue as guest" and has no account session. */
  guestMode: boolean;
  signIn: (email: string, password: string) => Promise<ApiUser>;
  signUp: (fields: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<ApiUser>;
  /** Sign in with the device's Google account and establish a backend session. */
  signInWithGoogle: () => Promise<ApiUser>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (u: ApiUser) => void;
  /** Enter guest browsing mode (persisted across app launches). */
  continueAsGuest: () => Promise<void>;
  /** Leave guest mode and return to the welcome/auth screen. */
  exitGuestMode: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function cacheUser(u: ApiUser | null) {
  if (u) AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
  else AsyncStorage.removeItem(USER_KEY).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const signingOut = useRef(false);

  setTokenProvider(() => token);
  setUnauthorizedHandler(() => {
    if (signingOut.current) return;
    signingOut.current = true;
    // Session expired — clear local credentials silently.
    void (async () => {
      try {
        await SecureStorage.deleteItemAsync(TOKEN_KEY);
      } catch {}
      cacheUser(null);
      setToken(null);
      setUserState(null);
      setStatus("guest");
      signingOut.current = false;
    })();
  });

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStorage.getItemAsync(TOKEN_KEY);
        if (!t) {
          const guest = await AsyncStorage.getItem(GUEST_KEY);
          setGuestMode(guest === "1");
          setStatus("guest");
          return;
        }
        setToken(t);
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached) {
          try {
            setUserState(JSON.parse(cached));
            setStatus("authed");
          } catch {}
        }
        // Revalidate token in the background.
        const me = await AuthApi.me();
        if (me?.user) {
          setUserState(me.user);
          cacheUser(me.user);
          setToken(t);
          setGuestMode(false);
          setStatus("authed");
        } else {
          throw new Error("invalid session");
        }
      } catch {
        try {
          await SecureStorage.deleteItemAsync(TOKEN_KEY);
        } catch {}
        cacheUser(null);
        setToken(null);
        setUserState(null);
        setGuestMode(false);
        setStatus("guest");
      }
    })();
  }, []);

  const applySession = async (res: { token: string; user: ApiUser }) => {
    await SecureStorage.setItemAsync(TOKEN_KEY, res.token);
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
    setToken(res.token);
    setUserState(res.user);
    setGuestMode(false);
    cacheUser(res.user);
    setStatus("authed");
    return res.user;
  };

  const signIn = async (email: string, password: string) => {
    const res = await AuthApi.loginUser({ email, password, expectedRole: "user" });
    return applySession(res);
  };

  const signUp = async (fields: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const res = await AuthApi.registerUser(fields);
    return applySession(res);
  };

  const signInWithGoogle = async (): Promise<ApiUser> => {
    if (!googleSignin) {
      throw new Error(
        "Google sign-in isn't available in this build. Please use email sign-in."
      );
    }
    try {
      const { GoogleSignin } = googleSignin;
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // v13+ returns { type: "success", data } | { type: "cancelled" }.
      if (result.type !== "success" || !result.data) {
        throw new Error("Google sign in was cancelled.");
      }
      const info = result.data;

      const authRes = await AuthApi.googleAuth({
        idToken: info.idToken ?? null,
        email: info.user.email,
        firstName: info.user.givenName ?? "",
        lastName: info.user.familyName ?? "",
        uid: info.user.id,
        loginType: "user",
      });
      if (!authRes?.user || !authRes?.token) {
        throw new Error(authRes?.message || "Google sign in failed.");
      }
      return applySession({ token: authRes.token, user: authRes.user });
    } catch (err) {
      if (googleSignin && googleSignin.isErrorWithCode(err)) {
        switch ((err as { code?: string | number }).code) {
          case googleSignin.statusCodes.SIGN_IN_CANCELLED:
            throw new Error("Google sign in was cancelled. Please try again.");
          case googleSignin.statusCodes.IN_PROGRESS:
            throw new Error("A Google sign in is already in progress.");
          case googleSignin.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error(
              "Google Play Services are not available on this device."
            );
          default:
            break;
        }
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await AuthApi.logout();
    } catch {
      // Network failures must not trap the user in a signed-in UI.
    }
    try {
      await SecureStorage.deleteItemAsync(TOKEN_KEY);
    } catch {}
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
    cacheUser(null);
    setToken(null);
    setUserState(null);
    setGuestMode(false);
    setStatus("guest");
  };

  const continueAsGuest = async () => {
    await AsyncStorage.setItem(GUEST_KEY, "1").catch(() => {});
    setToken(null);
    setUserState(null);
    cacheUser(null);
    setGuestMode(true);
    setStatus("guest");
  };

  const exitGuestMode = async () => {
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
    setGuestMode(false);
    setStatus("guest");
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const res = await AuthApi.me();
      if (res?.user) {
        setUserState(res.user);
        cacheUser(res.user);
      }
    } catch {
      // Offline: keep cached profile.
    }
  };

  const setUser = (u: ApiUser) => {
    setUserState(u);
    cacheUser(u);
  };

  const value = useMemo(
    () => ({ status, user, token, guestMode, signIn, signUp, signInWithGoogle, signOut, refreshMe, setUser, continueAsGuest, exitGuestMode }),
    // The handlers only close over stable setters (and `token`, which is already
    // listed), so re-creating the context object on every render is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, user, token, guestMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
