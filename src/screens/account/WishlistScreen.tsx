import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { WishlistApi } from "../../lib/api";
import { useWishlist } from "../../context/WishlistProvider";
import { PropertyCard } from "../../components/PropertyCard";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StateView } from "../../components/ui/StateView";
import type { Property } from "../../lib/types";

import { useNavigation } from "@react-navigation/native";
export function WishlistScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { ids, reload } = useWishlist();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The backend resolves saved ids to full property documents for us
      // (GET /wishlist/saved-properties/items), so no client-side matching.
      const res = await WishlistApi.items();
      setItems(res.properties || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
    // Refetch when the saved-id set changes so un-hearting removes the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ids]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My Wishlist" subtitle={`${ids.size} saved properties`} onBack={() => nav.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(p, i) => String(p._id ?? i)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 14, gap: 10 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 28, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !user ? (
            <StateView
              visible
              kind="empty"
              title="Sign in to see your wishlist"
              message="Tap the heart on any listing to save it — sign in first and it stays with your account."
              actionLabel="Sign in"
              onAction={() => nav.navigate("Login", { fromGuest: true })}
              style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 40 }}
            />
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load wishlist" message={error} onRetry={load} style={{ borderRadius: 0 }} />
          ) : (
            <StateView
              visible
              kind="empty"
              title="Nothing saved yet"
              message="Tap the ❤ on any listing to save it here for quick access."
              actionLabel="Explore properties"
              onAction={() => nav.navigate("Main", { screen: "Explore" } as never)}
              style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 40 }}
            />
          )
        }
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            style={{ flex: 1, maxWidth: "49%" }}
            onPress={() => nav.navigate("PropertyDetail", { id: String(item._id ?? item.id) } as never)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
