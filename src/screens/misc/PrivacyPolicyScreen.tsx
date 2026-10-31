import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const openWeb = () => {
    void Linking.openURL("https://kingofproperties-backend-five.vercel.app/privacy-policy");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Privacy Policy"
        subtitle="Data Safety & Disclosures"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={openWeb} hitSlop={8} style={styles.webBtn} accessibilityLabel="Open in browser">
            <Ionicons name="open-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Badge Card */}
        <View style={[styles.badgeCard, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.badgeTitle, { color: colors.text }]}>King of Properties</Text>
            <Text style={[styles.badgeSub, { color: colors.textMuted }]}>
              Version 1.0.0 · Updated October 2026
            </Text>
          </View>
        </View>

        {/* Section 1 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Overview & Commitment</Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            King of Properties operates premier real estate listing, stay booking, and interior styling services. We strictly do not sell, rent, or trade your personal data to any third-party advertising companies.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Information We Collect</Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>Account Details:</Text> Full name, email address, phone number, and cryptographically hashed password.
          </Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>Google Sign-In:</Text> Email, full name, profile picture, and Google ID token used solely for secure authentication.
          </Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>Approximate Location:</Text> City-level location from your search filters to display local properties. No background GPS tracking is performed.
          </Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>Inquiries & Bookings:</Text> Messages sent to sellers and stay visit reservations.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Android Device Permissions</Text>
          <View style={styles.permRow}>
            <Ionicons name="wifi-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permName, { color: colors.text }]}>Internet & Network State</Text>
              <Text style={[styles.permDesc, { color: colors.textMuted }]}>Required to load real-time property listings and user bookings.</Text>
            </View>
          </View>

          <View style={styles.permRow}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permName, { color: colors.text }]}>Camera (Optional)</Text>
              <Text style={[styles.permDesc, { color: colors.textMuted }]}>Used only when you voluntarily take a photo to set as your profile avatar.</Text>
            </View>
          </View>

          <View style={styles.permRow}>
            <Ionicons name="images-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permName, { color: colors.text }]}>Photos / Gallery (Optional)</Text>
              <Text style={[styles.permDesc, { color: colors.textMuted }]}>Accessed only when you pick a profile image. No background photo scanning is performed.</Text>
            </View>
          </View>
        </View>

        {/* Section 4 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Security & Encryption</Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            • All network communications use TLS 1.2 / TLS 1.3 (HTTPS) encryption in transit.
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            • Passwords are encrypted using bcrypt salted hashes.
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            • We do not collect or store credit card numbers on our servers.
          </Text>
        </View>

        {/* Section 5 - Google Play Account Deletion */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: "#fed7aa" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text style={[styles.sectionTitle, { color: "#9a3412", marginBottom: 0 }]}>
              5. Account Deletion Rights
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Per Google Play User Data policies, you can delete your account and personal data at any time:
          </Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>In-App:</Text> Go to Profile & Account &gt; Delete Account.
          </Text>
          <Text style={[styles.bullet, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.text, fontWeight: "700" }}>By Email:</Text> Send an email to support@kingofproperties.com with subject &quot;Delete My Account&quot;.
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted, marginTop: 4 }]}>
            All personal records and bookings will be permanently removed within 30 days.
          </Text>
        </View>

        {/* Section 6 - Contact */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Contact & Grievance</Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Support Email: support@kingofproperties.com
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Privacy Officer: privacy@kingofproperties.com
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Response Time: Within 24–48 business hours
          </Text>
        </View>

        {/* Open Web Button */}
        <Pressable
          onPress={openWeb}
          style={({ pressed }) => [
            styles.openWebBtn,
            { backgroundColor: colors.chipBg, borderColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="globe-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
            Open Official Web Policy
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 36 },
  webBtn: { padding: 6 },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeTitle: { fontSize: 16, fontWeight: "800" },
  badgeSub: { fontSize: 12, marginTop: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  bullet: { fontSize: 13, lineHeight: 19, marginLeft: 4 },
  permRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginTop: 6,
  },
  permName: { fontSize: 13.5, fontWeight: "700" },
  permDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  openWebBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
});

