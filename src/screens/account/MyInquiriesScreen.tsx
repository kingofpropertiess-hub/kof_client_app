import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { InquiryApi } from "../../lib/api";
import type { Inquiry } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StateView } from "../../components/ui/StateView";
import { formatDatePretty } from "../../utils/format";

export function MyInquiriesScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await InquiryApi.mine();
      setItems(res.inquiries || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Reload after a guest signs in from this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const statusMeta = (s?: string) => {
    switch ((s || "").toLowerCase()) {
      case "new": return { label: "New", color: colors.primary };
      case "contacted": case "sharedNumber": return { label: "Contacted", color: colors.warning };
      case "convinced": case "active": return { label: "Active", color: colors.success };
      case "notreachable": case "dead": return { label: "Closed", color: colors.danger };
      default: return { label: s || "Pending", color: colors.textMuted };
    }
  };

  const openProperty = (id?: string | number) => {
    if (!id) return;
    nav.navigate("PropertyDetail", { id: String(id) } as any);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My Inquiries" subtitle="Messages you've sent to sellers" onBack={() => nav.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(q, i) => q._id || String(i)}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !user ? (
            <StateView
              visible
              kind="empty"
              title="Sign in to see your inquiries"
              message="Send an inquiry from any listing and track the seller's reply here."
              actionLabel="Sign in"
              onAction={() => nav.navigate("Login", { fromGuest: true })}
              style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 30 }}
            />
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load inquiries" message={error} onRetry={load} style={{ borderRadius: 0 }} />
          ) : (
            <StateView
              visible
              kind="empty"
              title="No inquiries yet"
              message="Find a property you like and send an inquiry — sellers respond here."
              actionLabel="Explore properties"
              onAction={() => nav.navigate("Explore" as any)}
              style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 30 }}
            />
          )
        }
        renderItem={({ item }) => {
          const m = statusMeta(item.status);
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.icon, { backgroundColor: colors.chipBg }]}>
                  <Ionicons name="mail-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }} numberOfLines={1}>
                    {item.propertyTitle || "Property inquiry"}
                  </Text>
                  {item.createdAt ? <Text style={{ color: colors.textMuted, fontSize: 11.5 }}>{formatDatePretty(item.createdAt)}</Text> : null}
                </View>
                <Text style={{ color: m.color, fontSize: 11, fontWeight: "800" }}>{m.label}</Text>
              </View>
              {item.message ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 19 }} numberOfLines={3}>
                  {item.message}
                </Text>
              ) : null}
              {item.propertyId ? (
                <Pressable onPress={() => openProperty(item.propertyId)} style={{ marginTop: 10 }} accessibilityRole="button">
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12.5 }}>View property →</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 13 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});