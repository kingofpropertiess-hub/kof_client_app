import React, { useCallback, useState } from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { BookingApi } from "../../lib/api";
import type { Booking } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Chip } from "../../components/ui/Chip";
import { StateView } from "../../components/ui/StateView";
import { bookingStatusMeta, formatAmount, formatDatePretty } from "../../utils/format";
import { bookingRef } from "../../components/booking/BookingSheets";

const FILTERS = ["All", "Confirmed", "Pending", "Completed", "Cancelled"];

/** Categories the user books across. Property-SALE bookings no longer exist
 *  in the app — general bookings are rental site visits only. */
const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "stay", label: "Hotels & Villas" },
  { key: "site", label: "Site Visits" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

/** Which category a booking belongs to, based on what it was created from. */
function categoryOf(booking: Booking): Exclude<CategoryKey, "all"> {
  if (booking.stayId) return "stay"; // hourly hotel/villa booking
  return "site"; // rental-home site visit / reservation
}

export function BookingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>("all");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await BookingApi.list();
      setBookings(res.bookings || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const shown = bookings
    .filter(b => category === "all" || categoryOf(b) === category)
    .filter(b => filter === "All" || (b.bookingStatus || "").toLowerCase() === filter.toLowerCase());
  const catCount = useCallback(
    (key: CategoryKey) => bookings.filter(b => key === "all" || categoryOf(b) === key).length,
    [bookings]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ScreenHeader title="My Bookings" subtitle={`${bookings.length} total reservations`} />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(b, i) => String(b._id ?? i)}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            {/* Category chips — across everything you can book */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <Chip
                  key={c.key}
                  label={catCount(c.key) > 0 ? `${c.label} · ${catCount(c.key)}` : c.label}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </View>
            {/* Status chips */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <StateView visible kind="loading" message="Loading bookings…" style={{ borderRadius: 0 }} />
          ) : !user ? (
            <StateView
              visible
              kind="empty"
              title="Sign in to see your bookings"
              message="Book a site visit or an hourly stay — your reservations will show up here."
              actionLabel="Sign in"
              onAction={() => nav.navigate("Login", { fromGuest: true })}
              style={{ borderRadius: 0, backgroundColor: colors.background }}
            />
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load bookings" message={error} onRetry={load} style={{ borderRadius: 0 }} />
          ) : (
            <StateView
              visible
              kind="empty"
              title={
                filter === "All" && category === "all"
                  ? "No bookings yet"
                  : `No bookings in this filter`
              }
              message="Book a rental site visit or an hourly stay — they'll show up here."
              actionLabel="Explore properties"
              onAction={() => nav.navigate("Main", { screen: "Explore" } as never)}
              style={{ borderRadius: 0, backgroundColor: colors.background }}
            />
          )
        }
        renderItem={({ item }) => (
          <BookingRow booking={item} onPress={() => nav.navigate("BookingDetail", { id: String(item._id) } as never)} />
        )}
      />
    </View>
  );
}

export function BookingRow({ booking, onPress }: { booking: Booking; onPress?: () => void }) {
  const { colors } = useTheme();
  const meta = bookingStatusMeta(booking.bookingStatus);
  const isStay = !!booking.stayId;
  const when = booking.bookingDate
    ? `${formatDatePretty(booking.bookingDate)}${booking.slotLabel ? ` · ${booking.slotLabel}` : ""}`
    : booking.checkIn;
  const payMeta = String(booking.paymentStatus || "Pending");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.chipBg }}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.top, { borderBottomColor: colors.border }]}>
        <View style={[styles.svcIcon, { backgroundColor: isStay ? "rgba(225,29,72,0.1)" : colors.chipBg }]}>
          <Ionicons name={isStay ? "time" : "business-outline"} size={17} color={isStay ? colors.primary : colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{booking.propertyTitle}</Text>
          <Text style={[styles.ref, { color: colors.textMuted }]} numberOfLines={1}>
            {bookingRef(booking._id)}{booking.amount > 0 ? "" : " · Free"}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      {when ? (
        <View style={styles.whenRow}>
          <Ionicons name="calendar-clear-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.time, { color: colors.textMuted }]} numberOfLines={1}>{when}</Text>
        </View>
      ) : null}
      <View style={styles.bottom}>
        <View style={[styles.payPill, { backgroundColor: colors.chipBg }]}>
          <Ionicons
            name={payMeta === "Paid" ? "checkmark-circle" : "hourglass-outline"}
            size={11}
            color={payMeta === "Paid" ? colors.success : colors.warning}
          />
          <Text style={{ color: colors.textMuted, fontSize: 10.5, fontWeight: "800" }}>{payMeta}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={[styles.amount, { color: colors.text }]}>{formatAmount(booking.amount)}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 12, overflow: Platform.OS === "android" ? "hidden" : "visible" },
  top: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  svcIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14.5, fontWeight: "800" },
  ref: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  whenRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 9 },
  time: { fontSize: 12, fontWeight: "600", flex: 1 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  payPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  amount: { fontSize: 14.5, fontWeight: "800" },
  // legacy/unused kept absent
});
