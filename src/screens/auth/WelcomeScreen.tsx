import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../navigation/types";

export class BrandError extends Error {}

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Image
            source={require("../../../assets/appicon.png")}
            style={[s.logo, { width: 96, height: 96 }]}
            resizeMode="cover"
          />
          <View style={s.brandRow}>
            <Text style={[s.brand, { color: colors.text }]}>
              King of <Text style={{ color: colors.primary }}>Properties</Text>
            </Text>
          </View>
          <Text style={[s.tag, { color: colors.textMuted }]}>
            Buy, rent and book verified homes & hourly stays — all in one premium app.
          </Text>
        </View>

        <View style={s.features}>
          {[
            { icon: "home-outline" as const, title: "Verified listings", sub: "Zero-brokerage homes, plots & commercial spaces" },
            { icon: "calendar-outline" as const, title: "Instant site visits", sub: "Slot-based visit booking with live availability" },
            { icon: "bed-outline" as const, title: "Hourly stays", sub: "Hotels & villas for half-day relaxation" },
            { icon: "sparkles-outline" as const, title: "AI assistant", sub: "Just ask — flats in Delhi under ₹1 Cr" },
          ].map((f, i) => (
            <View key={i} style={[s.feature, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.fIcon, { backgroundColor: colors.chipBg }]}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.fTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[s.fSub, { color: colors.textMuted }]}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.ctas, { paddingBottom: insets.bottom + 8 }]}>
          <Button
            label="Create account"
            onPress={() => navigation.navigate("Register")}
            style={{ width: "100%", height: 52, borderRadius: 999 }}
          />
          <Button
            label="Sign in"
            onPress={() => navigation.navigate("Login")}
            variant="outline"
            style={{ width: "100%", height: 52, borderRadius: 999, marginTop: 10 }}
          />
          <Pressable
            onPress={() => void continueAsGuest()}
            style={s.guestBtn}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
          >
            <Text style={[s.guestText, { color: colors.textMuted }]}>Continue as guest</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
          </Pressable>
          <Text style={[s.terms, { color: colors.textMuted }]}>
            By continuing, you agree to our Terms &{" "}
            <Text
              onPress={() => navigation.navigate("PrivacyPolicy")}
              style={{ color: colors.primary, textDecorationLine: "underline" }}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { minHeight: "100%", justifyContent: "space-between", padding: 22 },
  hero: { alignItems: "center", marginTop: 30 },
  logo: { borderRadius: 24, marginBottom: 14 },
  brandRow: { alignItems: "center" },
  brand: { fontSize: 26, fontWeight: "900", letterSpacing: 0.2 },
  tag: { fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 300, lineHeight: 21 },
  features: { marginTop: 26, gap: 12 },
  feature: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 16, borderWidth: 1 },
  fIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fTitle: { fontSize: 15, fontWeight: "700" },
  fSub: { fontSize: 12.5, marginTop: 2 },
  ctas: { marginTop: 30 },
  guestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  guestText: { fontSize: 14, fontWeight: "700" },
  terms: { fontSize: 11.5, textAlign: "center", marginTop: 14, opacity: 0.8 },
});

void Platform;
