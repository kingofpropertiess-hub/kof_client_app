import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useProfilePhoto } from "../../auth/useProfilePhoto";
import { AuthApi } from "../../lib/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { FieldErrors, hasErrors, validateRegister } from "../../utils/validation";
import { initialsOf } from "../../utils/format";
import { ApiError } from "../../lib/client";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../navigation/types";

export function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { user, setUser } = useAuth();
  const { uploading: photoUploading, pickAndUpload, removePhoto } = useProfilePhoto();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    companyName: user?.companyName || "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.profileImage]);

  const avatarPhoto = user?.profileImage && !avatarFailed ? user.profileImage : null;

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  const save = async () => {
    const e = validateRegister({
      firstName: form.firstName,
      lastName: form.lastName,
      email: user?.email || "",
      phone: form.phone,
      password: "______",
    });
    if (e.password) delete e.password;
    if (e.email) delete e.email;
    setErrors(e);
    if (hasErrors(e)) return;
    if (!user) return;
    setSaving(true);
    try {
      const res = await AuthApi.updateUser(user._id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
      });
      const updated = res.user;
      if (updated?._id) {
        setUser(updated);
      } else {
        // backend returns success without echoing the user — refresh on next launch
        setUser({
          ...user,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          phone: form.phone.trim(),
          companyName: form.companyName.trim(),
        });
      }
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save changes";
      Alert.alert("Update failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 12 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Edit profile" onBack={() => navigation.goBack()} />
        <View style={{ gap: 14, marginTop: 8 }}>
          {/* Profile photo */}
          <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.photoWrap, { backgroundColor: colors.secondary }]}>
              {avatarPhoto ? (
                <Image
                  source={{ uri: avatarPhoto }}
                  style={{ width: "100%", height: "100%", borderRadius: 36 }}
                  resizeMode="cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={{ color: colors.onPrimary, fontWeight: "900", fontSize: 26 }}>{initialsOf(user?.fullName)}</Text>
              )}
              {photoUploading ? (
                <View style={[styles.photoOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14.5 }}>Profile photo</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>JPG or PNG, up to a few MB.</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}>
                <Pressable
                  disabled={photoUploading}
                  onPress={() =>
                    Alert.alert("Profile photo", "How do you want to add a photo?", [
                      { text: "Take photo", onPress: () => void pickAndUpload("camera") },
                      { text: "Choose from library", onPress: () => void pickAndUpload("library") },
                      { text: "Cancel", style: "cancel" },
                    ])
                  }
                  style={[styles.photoBtn, { borderColor: colors.primary }]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12.5 }}>
                    {avatarPhoto ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>
                {user?.profileImage ? (
                  <Pressable
                    disabled={photoUploading}
                    onPress={() =>
                      Alert.alert("Remove photo", "Remove your profile photo?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => void removePhoto() },
                      ])
                    }
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.danger, fontWeight: "800", fontSize: 12.5 }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <Input label="First name" value={form.firstName} onChangeText={t => set("firstName", t)} error={errors.firstName} autoCapitalize="words" />
          <Input label="Last name" value={form.lastName} onChangeText={t => set("lastName", t)} error={errors.lastName} autoCapitalize="words" />
          <Input label="Email" value={user?.email || ""} editable={false} placeholderTextColor={colors.textMuted} />
          <Input label="Phone" value={form.phone} onChangeText={t => set("phone", t)} keyboardType="phone-pad" error={errors.phone} />
          <Input label="Company (optional)" value={form.companyName} onChangeText={t => set("companyName", t)} autoCapitalize="words" />

          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            Your email address is tied to your sign-in and can't be changed here.
          </Text>
          <Button label="Save changes" loading={saving} disabled={saving} onPress={save} style={{ height: 50, marginTop: 6 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  photoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  photoWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
});
