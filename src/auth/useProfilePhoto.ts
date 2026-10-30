import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "./AuthProvider";
import { AuthApi } from "../lib/api";
import { ApiError } from "../lib/client";

/**
 * Profile photo pick / upload / remove, shared by ProfileScreen and
 * EditProfileScreen. Uploads go to PUT /users/:id (multipart) where the
 * backend stores the image on Cloudinary and persists `profileImage`.
 */
export function useProfilePhoto() {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = useCallback(
    async (uri: string) => {
      if (!user?._id) return;
      setUploading(true);
      try {
        const res = await AuthApi.uploadAvatar(user._id, uri);
        if (res.user?._id) setUser(res.user);
        Alert.alert("Profile photo updated", "Your new photo is now visible on your profile.");
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not upload the photo. Please try again.";
        Alert.alert("Upload failed", msg);
      } finally {
        setUploading(false);
      }
    },
    [user, setUser]
  );

  const removePhoto = useCallback(async () => {
    if (!user?._id) return;
    setUploading(true);
    try {
      const res = await AuthApi.updateUser(user._id, { profileImage: "" });
      if (res.user?._id) setUser(res.user);
      else setUser({ ...user, profileImage: "" });
      Alert.alert("Photo removed", "Your profile photo has been removed.");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not remove the photo. Please try again.";
      Alert.alert("Could not remove photo", msg);
    } finally {
      setUploading(false);
    }
  }, [user, setUser]);

  const pickAndUpload = useCallback(
    async (source: "camera" | "library") => {
      if (!user) return;
      const opts = { mediaType: "photo" as const, quality: 0.7 as const, maxWidth: 900, maxHeight: 900 };
      let res;
      try {
        res = source === "camera" ? await launchCamera(opts) : await launchImageLibrary(opts);
      } catch (e) {
        Alert.alert(
          source === "camera" ? "Camera unavailable" : "Could not open gallery",
          e instanceof Error ? e.message : "Please check app permissions and try again."
        );
        return;
      }
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) {
        Alert.alert(
          source === "camera" ? "Camera unavailable" : "Could not open gallery",
          res.errorMessage || "Please check app permissions and try again."
        );
        return;
      }
      await uploadPhoto(asset.uri);
    },
    [user, uploadPhoto]
  );

  /** Shows Camera / Library / (Remove) options in a native alert. */
  const promptPhotoOptions = useCallback(() => {
    if (!user) return;
    const buttons: { text: string; style?: "cancel" | "destructive" | "default"; onPress?: () => void }[] = [
      { text: "Choose from library", onPress: () => void pickAndUpload("library") },
      { text: "Take photo", onPress: () => void pickAndUpload("camera") },
    ];
    if (user.profileImage) {
      buttons.push({ text: "Remove photo", style: "destructive", onPress: () => void removePhoto() });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile photo", undefined, buttons);
  }, [user, pickAndUpload, removePhoto]);

  return { uploading, pickAndUpload, removePhoto, promptPhotoOptions };
}
