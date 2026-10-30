import * as Keychain from "react-native-keychain";

/**
 * Key-value storage for secrets (the auth JWT).
 *
 * Backed by `react-native-keychain`, which uses the Android Keystore /
 * iOS Keychain. Values are encrypted at rest and never written to
 * AsyncStorage or to the JS bundle.
 *
 * Only short strings are stored here (a JWT). Non-sensitive profile data
 * lives in AsyncStorage.
 */

const SERVICE_PREFIX = "com.kingofproperties.app.";

export const SecureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    const entry = await Keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
    if (!entry) return null;
    return entry.password;
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword("token", value, {
      service: SERVICE_PREFIX + key,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async deleteItemAsync(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
  },
};
