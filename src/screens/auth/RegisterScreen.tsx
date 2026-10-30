import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { FieldErrors, hasErrors, validateRegister } from "../../utils/validation";
import { ApiError } from "../../lib/client";

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const fromGuest = !!route.params?.fromGuest;
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  const submit = async () => {
    const e = validateRegister(form);
    if (!agreed) e.agreed = "Please accept the Terms & Privacy Policy";
    setErrors(e);
    if (hasErrors(e)) {
      if (e.agreed) {
        Alert.alert("Terms required", "Please accept the Terms & Privacy Policy to continue.");
      }
      return;
    }
    setLoading(true);
    try {
      await signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      // Guest flow: close the auth modal and return to the browsing screen.
      if (fromGuest) navigation.goBack();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      Alert.alert("Registration failed", msg);
    } finally {
      setLoading(false);
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
        <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Book site visits, save favourites and get rental leads — all free.
        </Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <View style={styles.row}>
            <Input label="First name" value={form.firstName} onChangeText={t => set("firstName", t)} placeholder="Rohit" error={errors.firstName} style={{ flex: 1 }} autoCapitalize="words" />
            <Input label="Last name" value={form.lastName} onChangeText={t => set("lastName", t)} placeholder="Sharma" error={errors.lastName} style={{ flex: 1 }} autoCapitalize="words" />
          </View>
          <Input label="Email" value={form.email} onChangeText={t => set("email", t)} placeholder="you@example.com" keyboardType="email-address" error={errors.email} />
          <Input label="Phone (optional)" value={form.phone} onChangeText={t => set("phone", t)} placeholder="98765 43210" keyboardType="phone-pad" error={errors.phone} />
          <Input label="Password" value={form.password} secure onChangeText={t => set("password", t)} placeholder="At least 6 characters" error={errors.password} />
          <Input label="Confirm password" value={form.confirmPassword} secure onChangeText={t => set("confirmPassword", t)} placeholder="Repeat password" error={errors.confirmPassword} />

          <Pressable onPress={() => setAgreed(a => !a)} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
            <View style={[styles.box, { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : "transparent" }]}>
              {agreed ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>
              I agree to the <Text style={{ color: colors.primary, fontWeight: "700" }}>Terms & Privacy Policy</Text>
            </Text>
          </Pressable>

          <Button label="Create account" loading={loading} disabled={loading} onPress={submit} style={{ marginTop: 4, height: 52 }} />
          <View style={styles.footer}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Already registered? </Text>
            <Pressable
              onPress={() =>
                fromGuest ? navigation.replace("Login", { fromGuest: true }) : navigation.navigate("Login")
              }
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 10, paddingTop: 4 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: "900" },
  sub: { fontSize: 14, marginTop: 6 },
  row: { flexDirection: "row", gap: 12 },
  agree: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14 },
});
