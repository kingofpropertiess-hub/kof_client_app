import { useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "./AuthProvider";

/**
 * Guards account-only actions (wishlist, bookings, inquiries, ...).
 *
 * Returns `true` when the user is signed in. For guests it shows a friendly
 * prompt with Sign in / Create account options and returns `false`, so callers
 * can simply bail out: `if (!requireAuth("...")) return;`
 */
export function useAuthGate() {
  const { user } = useAuth();
  const nav = useNavigation<any>();

  return useCallback(
    (message = "Sign in to save properties, book visits and contact sellers.") => {
      if (user) return true;
      Alert.alert("Sign in to continue", message, [
        { text: "Not now", style: "cancel" },
        { text: "Sign in", onPress: () => nav.navigate("Login", { fromGuest: true }) },
        { text: "Create account", onPress: () => nav.navigate("Register", { fromGuest: true }) },
      ]);
      return false;
    },
    [user, nav]
  );
}
