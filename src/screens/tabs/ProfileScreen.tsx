import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useAuthGate } from "../../auth/useAuthGate";
import { useProfilePhoto } from "../../auth/useProfilePhoto";
import { BookingApi, InquiryApi } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { initialsOf } from "../../utils/format";

import { useNavigation } from "@react-navigation/native";
export function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user, signOut, guestMode, exitGuestMode } = useAuth();
  const requireAuth = useAuthGate();
  const { uploading: photoUploading, promptPhotoOptions } = useProfilePhoto();
  const [stats, setStats] = useState({ bookings: 0, inquiries: 0 });
  const [avatarFailed, setAvatarFailed] = useState(false);

  // A brand-new upload has a new URL — allow a fresh load attempt.
  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.profileImage]);

  const avatarPhoto = !guestMode && user?.profileImage && !avatarFailed ? user.profileImage : null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [b, q] = await Promise.allSettled([BookingApi.list(), InquiryApi.mine()]);
        setStats({
          bookings: b.status === "fulfilled" ? b.value.bookings?.length || 0 : 0,
          inquiries: q.status === "fulfilled" ? q.value.inquiries?.length || 0 : 0,
        });
      } catch {}
    })();
  }, [user]);

  const CareRow = ({ icon, label, sub, to, authOnly }: { icon: string; label: string; sub?: string; to?: string; authOnly?: boolean }) => (
    <Pressable
      onPress={() => {
        if (authOnly && !requireAuth("Sign in to access your profile, wishlist, inquiries and notifications.")) return;
        if (to) nav.navigate(to);
      }}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="button"
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon as never} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      {to ? <Ionicons name="chevron-forward" size={17} color={colors.textMuted} /> : null}
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader title="Profile & Account" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => {
              if (!guestMode && !photoUploading) promptPhotoOptions();
            }}
            disabled={guestMode}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={styles.avatarWrap}
          >
            <View style={[styles.avatar, { backgroundColor: guestMode ? colors.chipBg : colors.secondary }]}>
              {guestMode ? (
                <Ionicons name="person" size={24} color={colors.primary} />
              ) : avatarPhoto ? (
                <Image
                  source={{ uri: avatarPhoto }}
                  style={{ width: "100%", height: "100%", borderRadius: 27 }}
                  resizeMode="cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={{ color: colors.onPrimary, fontWeight: "900", fontSize: 20 }}>{initialsOf(user?.fullName)}</Text>
              )}
            </View>
            {!guestMode ? (
              <View style={[styles.cameraBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name={photoUploading ? "hourglass-outline" : "camera"} size={12} color={colors.primary} />
              </View>
            ) : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {guestMode ? "Guest user" : user?.fullName || user?.email || "Guest user"}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
              {guestMode ? "Browsing without an account" : user?.email}
            </Text>
            {!guestMode && user?.phone ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>+91 {user.phone}</Text> : null}
          </View>
          {!guestMode ? (
            <View style={[styles.verified, { backgroundColor: colors.chipBg }]}>
              <Ionicons name="person" size={12} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 10.5, fontWeight: "800" }}>User</Text>
            </View>
          ) : null}
        </View>

        {guestMode ? (
          <View style={{ gap: 10 }}>
            <Button
              label="Sign in"
              onPress={() => nav.navigate("Login", { fromGuest: true })}
              style={{ height: 48, borderRadius: 999 }}
            />
            <Button
              label="Create account"
              variant="outline"
              onPress={() => nav.navigate("Register", { fromGuest: true })}
              style={{ height: 48, borderRadius: 999 }}
            />
          </View>
        ) : null}

        {/* Stats */}
        {!guestMode ? (
          <View style={styles.statRow}>
            {[
              { n: stats.bookings, l: "Bookings" },
              { n: stats.inquiries, l: "Inquiries" },
              { n: 0, l: "Saved" },
            ].map((s, i) => (
              <View key={i} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statN, { color: colors.text }]}>{s.n}</Text>
                <Text style={[styles.statL, { color: colors.textMuted }]}>{s.l}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[styles.section, { color: colors.textMuted }]}>ACCOUNT</Text>
        <CareRow icon="person-outline" label="Edit profile" sub="Photo, name, phone & details" to="EditProfile" authOnly />
        <CareRow icon="heart-outline" label="My wishlist" sub="Saved properties" to="Wishlist" authOnly />
        <CareRow icon="chatbubble-ellipses-outline" label="My inquiries" sub="Messages sent to owners & vendors" to="MyInquiries" authOnly />
        <CareRow icon="notifications-outline" label="Notifications" to="Notifications" authOnly />

        <Text style={[styles.section, { color: colors.textMuted }]}>SERVICES</Text>
        <CareRow icon="sparkles-outline" label="AI Property Assistant" sub="Ask anything about property search" to="AiChat" />
        <CareRow icon="happy-outline" label="Design & style experts" sub="Interior & architecture pros" to="Experts" />

        <Text style={[styles.section, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.themeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(
            [
              { m: "light", label: "Light", icon: "sunny-outline" as const },
              { m: "dark", label: "Dark", icon: "moon-outline" as const },
              { m: "system", label: "System", icon: "phone-portrait-outline" as const },
            ] as const
          ).map(t => (
            <Pressable
              key={t.m}
              onPress={() => setMode(t.m as "light" | "dark" | "system")}
              style={[styles.themeRow, mode === t.m && { backgroundColor: colors.chipBg }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === t.m }}
            >
              <Ionicons name={t.icon} size={18} color={mode === t.m ? colors.primary : colors.textMuted} />
              <Text style={[styles.themeLabel, { color: mode === t.m ? colors.primary : colors.text }]}>{t.label}</Text>
              {mode === t.m ? <Ionicons name="checkmark" size={17} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>OTHER</Text>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>About King of Properties</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Version 1.0.0 · Buy, rent, book & invest</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (guestMode) {
              void exitGuestMode();
              return;
            }
            Alert.alert(
              "Log out",
              "Are you sure you want to log out of your account?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Log out", style: "destructive", onPress: () => void signOut() },
              ]
            );
          }}
          style={[styles.logoutBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={guestMode ? "Back to welcome screen" : "Log out"}
        >
          <Text style={{ color: guestMode ? colors.textMuted : colors.danger, fontWeight: "800", fontSize: 15 }}>
            {guestMode ? "Back to welcome screen" : "Log out"}
          </Text>
        </Pressable>
        <Text style={{ color: colors.textMuted, fontSize: 11.5, textAlign: "center", marginTop: 6 }}>
          {guestMode
            ? "You're browsing as a guest. Sign in anytime to save properties, book visits and contact sellers."
            : "Your session stays signed in for 7 days, or until you log out."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  avatarWrap: { width: 54, height: 54 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 17, fontWeight: "900" },
  verified: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  statN: { fontSize: 19, fontWeight: "900" },
  statL: { fontSize: 11.5, marginTop: 2, fontWeight: "600" },
  section: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1, marginTop: 8, marginBottom: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14.5, fontWeight: "700" },
  rowSub: { fontSize: 12, marginTop: 2 },
  themeCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  themeLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  logoutBtn: { borderWidth: 1.5, borderRadius: 14, alignItems: "center", paddingVertical: 13, marginTop: 4 },
});
