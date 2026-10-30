import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { NotificationApi } from "../../lib/api";
import type { NotificationItem } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StateView } from "../../components/ui/StateView";
import { formatDatePretty } from "../../utils/format";

export function NotificationsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
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
      const res = await NotificationApi.list();
      setItems(res.notifications || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    try {
      await NotificationApi.readAll();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e: unknown) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Could not mark all as read");
    }
  };

  const tapNote = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await NotificationApi.readOne(n._id);
        setItems(prev => prev.map(x => (x._id === n._id ? { ...x, read: true } : x)));
      }
    } catch {}
  };

  const remove = async (id: string) => {
    try {
      await NotificationApi.remove(id);
      setItems(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Notifications"
        onBack={() => nav.goBack()}
        right={
          items.length > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} style={{ marginRight: 6 }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />
      <FlatList
        data={items}
        keyExtractor={(n, i) => n._id || String(i)}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <StateView visible kind="loading" message="Loading notifications…" style={{ borderRadius: 0 }} />
          ) : !user ? (
            <StateView
              visible
              kind="empty"
              title="Sign in for updates"
              message="Booking and inquiry updates will appear here once you're signed in."
              actionLabel="Sign in"
              onAction={() => nav.navigate("Login", { fromGuest: true })}
              style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 30 }}
            />
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load notifications" message={error} onRetry={load} style={{ borderRadius: 0 }} />
          ) : (
            <StateView visible kind="empty" title="You're all caught up" message="Booking and inquiry updates will appear here." style={{ borderRadius: 0, backgroundColor: colors.background, marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void tapNote(item)}
            style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <View style={[styles.dot, { backgroundColor: colors.primary, opacity: item.read ? 0.15 : 1 }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: item.read ? "600" : "800", fontSize: 14 }}>
                {item.title || "Update"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 18 }}>
                {item.message || item.body}
              </Text>
              {item.createdAt ? <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{formatDatePretty(item.createdAt)}</Text> : null}
            </View>
            <Pressable onPress={() => void remove(item._id)} hitSlop={10} accessibilityLabel="Delete notification">
              <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  note: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, alignItems: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
});