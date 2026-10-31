import React, { useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { hasErrors, validateLogin, FieldErrors } from "../../utils/validation";
import { ApiError } from "../../lib/client";

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const fromGuest = !!route.params?.fromGuest;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    const e = validateLogin({ email, password });
    setErrors(e);
    if (hasErrors(e)) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Guest flow: the auth modal is pushed on top of the main stack, so close
      // it to drop the user back on the screen they were browsing.
      // The welcome flow is swapped out by RootNavigator instead.
      if (fromGuest) navigation.goBack();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign in failed. Please try again.";
      Alert.alert("Sign in failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && fromGuest) navigation.goBack();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : (err as { message?: string })?.message ||
            "Google sign in failed. Please try again.";
      Alert.alert("Sign in failed", msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Sign in with your King of Properties user account.
        </Text>

        <View style={{ marginTop: 26, gap: 16 }}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={t => {
              setEmail(t);
              if (errors.email) setErrors(p => ({ ...p, email: "" }));
            }}
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            secure
            onChangeText={t => {
              setPassword(t);
              if (errors.password) setErrors(p => ({ ...p, password: "" }));
            }}
            error={errors.password}
          />
          <Button
            label="Sign in"
            loading={loading}
            disabled={loading || googleLoading}
            onPress={submit}
            style={{ marginTop: 8, borderRadius: 14, height: 52 }}
          />

          {/* Play Store Reviewer / Demo Quick Autofill */}
          <Pressable
            onPress={() => {
              setEmail("demo@kingofproperties.com");
              setPassword("Demo@123456");
              setErrors({});
            }}
            style={({ pressed }) => [
              styles.demoCard,
              {
                borderColor: colors.primary,
                backgroundColor: colors.chipBg,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Autofill Demo Reviewer Account"
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="key-outline" size={15} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
                Play Store Reviewer / Demo Account
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 3 }}>
              Tap to fill demo@kingofproperties.com / Demo@123456
            </Text>
          </Pressable>

          {/* Separator */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Continue with Google */}
          <Button
            label="Continue with Google"
            icon={
              <Image
                source={require("../../assets/google_g.png")}
                style={styles.googleIcon}
              />
            }
            loading={googleLoading}
            disabled={loading || googleLoading}
            onPress={submitGoogle}
            style={{ backgroundColor: colors.surface, borderRadius: 14, height: 52, borderWidth: 1.5, borderColor: colors.border }}
            labelStyle={{ color: colors.text }}
          />

          <View style={styles.footer}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>New here? </Text>
            <Pressable
              onPress={() =>
                fromGuest ? navigation.replace("Register", { fromGuest: true }) : navigation.navigate("Register")
              }
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>Create an account</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigation.navigate("PrivacyPolicy")}
            hitSlop={8}
            style={{ alignItems: "center", marginTop: 14 }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: "underline" }}>
              Privacy Policy & Terms
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 10, paddingTop: 4 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: "900" },
  sub: { fontSize: 14, marginTop: 6 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, opacity: 0.7 },
  googleIcon: { width: 20, height: 20 },
  demoCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
