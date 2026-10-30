import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { StayApi } from "../../lib/api";
import type { Stay } from "../../lib/types";
import { SmartImage } from "../../components/ui/SmartImage";
import { StateView } from "../../components/ui/StateView";
import { compactPrice } from "../../utils/format";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

import { useNavigation } from "@react-navigation/native";
export function StaysScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await StayApi.list();
      const list = Array.isArray(raw) ? raw : ((raw as unknown as { stays?: Stay[] }).stays || []);
      setStays(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stays");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const live = stays ? stays.filter(s => !s.status || ["PUBLISHED", "Active", "Published"].includes(s.status)) : [];
  const list = live.length > 0 ? live : stays || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ScreenHeader title="Stays & Hourly Hotels" subtitle="Hotels and villas for a few hours of rest" />
      </View>
      <FlatList
        data={list}
        keyExtractor={(s, i) => String(s._id ?? i)}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <StateView visible kind="loading" message="Loading stays…" style={{ borderRadius: 0 }} />
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load stays" message={error} onRetry={load} style={{ borderRadius: 0 }} />
          ) : (
            <StateView
              visible
              kind="empty"
              title="No stays listed right now"
              message="Partner hotels appear here as vendors add them. Pull to refresh."
              style={{ borderRadius: 0, backgroundColor: colors.background }}
            />
          )
        }
        renderItem={({ item }) => (
          <StayRow stay={item} onPress={() => nav.navigate("StayDetail", { id: String(item._id) } as never)} />
        )}
      />
    </View>
  );
}

function StayRow({ stay, onPress }: { stay: Stay; onPress: () => void }) {
  const { colors } = useTheme();
  const price = stay.price ?? stay.pricePerHour ?? stay.startingRate;
  const label = stay.priceLabel || (price ? compactPrice(price, undefined, " / hr") : "Price on request");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${stay.name ?? "stay"} details`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <SmartImage uri={stay.images?.[0]} label={stay.type || "Stay"} style={styles.img} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {stay.name || (stay as unknown as { title?: string }).title}
        </Text>
        <Text style={[styles.loc, { color: colors.textMuted }]} numberOfLines={1}>
          {[stay.location, stay.city].filter(Boolean).join(", ")}
        </Text>
        <View style={styles.metaRow}>
          {stay.rating ? (
            <View style={[styles.rating, { backgroundColor: colors.chipBg }]}>
              <Text style={{ color: colors.warning, fontWeight: "800", fontSize: 12 }}>★ {stay.rating}</Text>
            </View>
          ) : null}
          {stay.isVerified ? <Text style={{ color: colors.success, fontWeight: "700", fontSize: 11.5 }}>✓ Verified</Text> : null}
        </View>
        <Text style={[styles.price, { color: colors.primary }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center" },
  img: { width: 108, height: 88, borderRadius: 12 },
  name: { fontSize: 15.5, fontWeight: "800" },
  loc: { fontSize: 12.5, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  rating: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  price: { fontSize: 16, fontWeight: "800", marginTop: 5 },
});
