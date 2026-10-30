import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { BookingApi } from "../../lib/api";
import type { Booking } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { StateView } from "../../components/ui/StateView";
import { bookingStatusMeta, formatAmount, formatDatePretty, formatSlotLabel } from "../../utils/format";
import { bookingRef } from "../../components/booking/BookingSheets";

export function BookingDetailScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const id = route.params?.id;
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await BookingApi.get(id);
      setBooking(res.booking);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const res = await BookingApi.updateStatus(booking._id, "Cancelled");
      setBooking(res.booking);
      setCancelOpen(false);
      Alert.alert("Cancelled", res.booking?.bookingStatus === "Cancelled" ? "Your booking has been cancelled." : "Cancellation requested.");
    } catch (err) {
      Alert.alert("Could not cancel", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const shareBooking = async () => {
    if (!booking) return;
    try {
      const summary = [
        `King of Properties — Booking`,
        `${booking.propertyTitle}`,
        `Status: ${bookingStatusMeta(booking.bookingStatus).label}`,
        booking.bookingDate ? `Date: ${formatDatePretty(booking.bookingDate)}` : "",
        booking.slotLabel ? `Slot: ${formatSlotLabel(booking.slotLabel)}` : "",
        `Amount: ${formatAmount(booking.amount)}`,
        `Booking ID: ${booking._id}`,
      ].filter(Boolean).join("\n");
      await Share.share({ message: summary, title: "Booking details" });
    } catch {
      // User cancelled or share unavailable — not an error.
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Booking details" onBack={() => navigation.goBack()} />
        <StateView
          visible
          kind="empty"
          title="Sign in to view this booking"
          message="Bookings are linked to your account."
          actionLabel="Sign in"
          onAction={() => navigation.navigate("Login", { fromGuest: true })}
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Booking details" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Booking details" onBack={() => navigation.goBack()} />
        <StateView visible kind="error" title="Couldn't load booking" message={error || "Not found"} onRetry={load} />
      </SafeAreaView>
    );
  }

  const meta = bookingStatusMeta(booking.bookingStatus);
  const isOwner = user && (String(booking.customerEmail || "").toLowerCase() === String(user.email).toLowerCase() || String(booking.customerName) === String(user.fullName));
  const canCancel = ["Confirmed", "Pending"].includes(String(booking.bookingStatus));

  const heroHint =
    meta.label === "Confirmed"
      ? "Show this booking at check-in"
      : meta.label === "Pending"
      ? "Awaiting confirmation from the vendor"
      : meta.label === "Completed"
      ? "This visit/stay is completed"
      : "This booking was cancelled";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 12 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Booking details" onBack={() => navigation.goBack()} />

        {/* Status hero */}
        <View style={[styles.hero, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.label === "Cancelled" ? "close-circle" : meta.label === "Pending" ? "hourglass" : "checkmark-circle"} size={30} color={meta.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: meta.color, fontSize: 17, fontWeight: "900" }}>{meta.label}</Text>
            <Text style={{ color: meta.color, fontSize: 12.5, opacity: 0.8 }}>{heroHint}</Text>
            <View style={[styles.refChip, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
              <Text style={{ color: meta.color, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 }}>
                REF {bookingRef(booking._id)} · PAYMENT {String(booking.paymentStatus || "Pending").toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: meta.color, fontWeight: "900", fontSize: 16 }}>{formatAmount(booking.amount)}</Text>
          </View>
        </View>

        {/* Property + schedule */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>{booking.propertyTitle}</Text>
          <View style={{ gap: 9, marginTop: 12 }}>
            {[
              { l: "Reference", v: bookingRef(booking._id) },
              { l: "Service", v: booking.service || "Property Booking" },
              { l: "Date", v: booking.bookingDate ? formatDatePretty(booking.bookingDate) : "—" },
              { l: "Slot", v: booking.slotLabel ? formatSlotLabel(booking.slotLabel) : booking.checkIn || "—" },
              { l: "Guests", v: String(booking.guests || 1) },
              booking.roomNumber ? { l: "Room", v: `${booking.roomNumber}${booking.roomType ? ` · ${booking.roomType}` : ""}` } : null,
              { l: "Booked on", v: booking.createdAt ? formatDatePretty(booking.createdAt) : "—" },
            ].filter(Boolean).map(row => {
              const r = row as { l: string; v: string };
              return (
                <View key={r.l} style={[styles.kv, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.l}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", maxWidth: 210 }} numberOfLines={1}>{r.v}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Guest details</Text>
          <View style={{ gap: 9, marginTop: 12 }}>
            {[
              { l: "Name", v: booking.customerName || "—" },
              { l: "Email", v: booking.customerEmail || "—" },
              { l: "Phone", v: booking.customerPhone || "—" },
            ].map(r => (
              <View key={r.l} style={[styles.kv, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.l}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{r.v}</Text>
              </View>
            ))}
            {booking.specialRequests ? (
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Special requests</Text>
                <Text style={{ color: colors.text, fontSize: 13.5, marginTop: 4, lineHeight: 20 }}>{booking.specialRequests}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {isOwner !== true && user ? <Text style={{ color: colors.textMuted, fontSize: 11.5, textAlign: "center" }}>You're viewing booking {booking._id.slice(-6).toUpperCase()}</Text> : null}
      </ScrollView>

      {/* Actions */}
      {canCancel ? (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Button label="Share" variant="outline" onPress={() => void shareBooking()} style={{ flex: 1, height: 46 }} />
          <Button label="Cancel booking" variant="danger" onPress={() => setCancelOpen(true)} style={{ flex: 1.4, height: 46 }} />
        </View>
      ) : (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Button label="Share details" variant="outline" onPress={() => void shareBooking()} style={{ flex: 1, height: 46 }} />
        </View>
      )}

      {/* Cancel confirm modal */}
      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)} statusBarTranslucent>
        <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Ionicons name="alert-circle" size={36} color={colors.warning} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900", marginTop: 10 }}>Cancel this booking?</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 }}>
              This can't be undone. The vendor/owner will be notified.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.reasonBox, { borderColor: colors.border, color: colors.text, backgroundColor: colors.chipBg }]}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setCancelOpen(false)} style={[styles.dlgBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>Keep booking</Text>
              </Pressable>
              <Pressable onPress={() => void cancelBooking()} disabled={cancelling} style={[styles.dlgBtn, { backgroundColor: colors.danger, borderColor: colors.danger }]}>
                {cancelling ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Cancel booking</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { flexDirection: "row", borderRadius: 16, padding: 16, alignItems: "center" },
  refChip: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 7 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  secTitle: { fontSize: 15, fontWeight: "800" },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  actionBar: { borderTopWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 380, borderRadius: 20, padding: 20, alignItems: "center" },
  reasonBox: { width: "100%", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 14 },
  dlgBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
