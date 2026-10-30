import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useAuthGate } from "../../auth/useAuthGate";
import { StayApi, BookingApi } from "../../lib/api";
import type { Stay, RoomTypeLike, PropertySlot } from "../../lib/types";
import { SmartImage } from "../../components/ui/SmartImage";
import { Button } from "../../components/ui/Button";
import { StateView } from "../../components/ui/StateView";
import { BookingConfirmSheet, BookingSuccessSheet, bookingRef } from "../../components/booking/BookingSheets";
import { dateStrip, toISODate, formatPriceINR } from "../../utils/format";
import { FieldErrors, validateContact } from "../../utils/validation";

type AvailResponse = {
  success?: boolean;
  availableRooms?: { _id: string; roomNumber: string }[];
  isSoldOut?: boolean;
  availableCount?: number;
  error?: string;
};

export function StayDetailScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const id = route.params?.id;
  const { user } = useAuth();
  const requireAuth = useAuthGate();

  const [stay, setStay] = useState<Stay | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(toISODate(new Date()));
  const [roomType, setRoomType] = useState<RoomTypeLike | null>(null);
  const [startMin, setStartMin] = useState("10:00");
  const [duration, setDuration] = useState(1);
  const [guests, setGuests] = useState(1);
  const [avail, setAvail] = useState<AvailResponse | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [slots, setSlots] = useState<PropertySlot[]>([]);

  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [special, setSpecial] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ bookingId?: string; roomNumber: string; status: string } | null>(null);

  useEffect(() => {
    if (user) setContact({ name: user.fullName || "", email: user.email || "", phone: user.phone || "" });
    // Prefill only when the signed-in identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const s = await StayApi.get(id);
        setStay(s);
        try {
          const raw = await StayApi.roomTypes(id);
          const list = Array.isArray(raw)
            ? raw
            : ((raw as { roomTypes?: RoomTypeLike[]; reservation?: RoomTypeLike[] })?.roomTypes ??
              (raw as { reservation?: RoomTypeLike[] })?.reservation ??
              []);
          setRoomTypes(list as RoomTypeLike[]);
          if (list.length > 0) setRoomType(list[0]);
          else setRoomType(null);
        } catch {
          setRoomType(null);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load stay");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const hourlySlotList = useMemo(() => {
    // 10:00 → 20:00 starts, in 1h steps (matches typical hourly hotel operations)
    const out: string[] = [];
    for (let h = 10; h <= 20; h++) out.push(`${h < 10 ? "0" + h : h}:00`);
    return out;
  }, []);

  const isToday = date === toISODate(new Date());

  /** Aaj ke liye jo start-times nikal chuke hain wo list se hat jati hain. */
  const startSlotOptions = useMemo(() => {
    if (!isToday) return hourlySlotList;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return hourlySlotList.filter(t => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0) >= nowMins;
    });
  }, [hourlySlotList, isToday]);

  // Jo slot select tha wo nikal gaya ho toh pehle available slot pe jump karo.
  useEffect(() => {
    if (startSlotOptions.length > 0 && !startSlotOptions.includes(startMin)) {
      setStartMin(startSlotOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSlotOptions.join(",")]);

  /** Aaj ke saare slots nikal gaye — booking aaj ke liye band. */
  const todaySoldOut = isToday && startSlotOptions.length === 0;

  const checkAvailability = async () => {
    if (!id) return;
    setAvailLoading(true);
    setSlots([]);
    try {
      const res = await StayApi.getAvailability(id, {
        date,
        roomTypeId: roomType?._id,
        duration,
        startTime: startMin,
      });
      setAvail(res as AvailResponse);
      const slotList = (res as unknown as { slots?: PropertySlot[] })?.slots;
      if (Array.isArray(slotList)) {
        setSlots(slotList.filter(s => s.status === "Available"));
      }
    } catch {
      setAvail(null);
    } finally {
      setAvailLoading(false);
    }
  };

  useEffect(() => {
    void checkAvailability();
    // Availability is keyed by stay/room/date/window only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date, roomType?._id, startMin, duration]);

  const submit = async () => {
    console.log("[hotel booking] submit pressed", { date, startMin, duration, guests, hasRoomType: !!roomType });
    if (!stay) return;
    const errs = validateContact(contact);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (roomType) {
        // Room types exist → allot a physical room (hotel hourly booking).
        const res = await BookingApi.createHotelBooking({
          stayId: stay._id,
          roomTypeId: roomType._id,
          date,
          startTime: startMin,
          duration,
          guests,
          customerName: contact.name.trim(),
          customerEmail: contact.email.trim(),
          customerPhone: contact.phone.trim(),
          specialRequests: special.trim(),
        });
        setDone({
          bookingId: res.booking?._id,
          roomNumber: String(res.assignedRoomNumber ?? "—"),
          status: res.booking?.bookingStatus || "Confirmed",
        });
      } else {
        // No room types configured → book the stay itself via the general endpoint.
        const startMins = (() => {
          const [h, m] = startMin.split(":").map(Number);
          return (h || 0) * 60 + (m || 0);
        })();
        const endLabel = (() => {
          const min = (startMins + duration * 60) % 1440;
          return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
        })();
        const res = await BookingApi.create({
          propertyId: stay._id,
          propertyTitle: stay.name,
          vendorId: stay.vendorId,
          bookingDate: date,
          startTime: startMin,
          endTime: endLabel,
          slotLabel: `${startMin}–${endLabel}`,
          service: `Hourly stay (${duration}h) — ${stay.name}`,
          guests,
          amount: total,
          customerName: contact.name.trim(),
          customerEmail: contact.email.trim(),
          customerPhone: contact.phone.trim(),
        });
        setDone({
          bookingId: res.booking?._id || res.bookingId,
          roomNumber: "—",
          status: res.booking?.bookingStatus || "Confirmed",
        });
      }
      setConfirmOpen(false);
      void checkAvailability();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not complete the booking";
      console.log("[hotel booking] failed:", err);
      // Keep the sheet open and show the reason inline (Alert hides behind Modal on Android).
      setSubmitError(msg);
      void checkAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stay) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <StateView visible kind="error" title="Couldn't load stay" message={error || "Not found"} onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const startTimeMins = (() => {
    const [h, m] = startMin.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  })();
  const endTimeMins = startTimeMins + duration * 60;
  const fmtMin = (min: number) => `${String(Math.floor((min % 1440) / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const pricePerHour = roomType?.pricePerHour ?? stay.pricePerHour ?? stay.price ?? 500;
  const total = Math.round(pricePerHour * duration);

  const canBook = !avail?.error && (avail === null || availLoading ? false : !(avail?.isSoldOut === true && (avail?.availableCount ?? 1) === 0 && slots.length === 0));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <View>
          <SmartImage uri={stay.images?.[0]} label="Stay photo" style={{ width: "100%", height: 250 }} />
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150, gap: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>{stay.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="location-sharp" size={14} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 13.5 }}>{[stay.location, stay.city].filter(Boolean).join(", ")}</Text>
          </View>
          {stay.description ? (
            <Text style={{ color: colors.textMuted, fontSize: 13.5, lineHeight: 21, marginTop: 6 }}>{stay.description}</Text>
          ) : null}

          {/* Room types */}
          {roomTypes.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>Select room type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {roomTypes.map(rt => (
                  <Pressable
                    key={rt._id}
                    onPress={() => { setRoomType(rt); }}
                    style={[
                      styles.roomChip,
                      {
                        backgroundColor: roomType?._id === rt._id ? colors.primary : colors.chipBg,
                        borderColor: roomType?._id === rt._id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: roomType?._id === rt._id ? "#fff" : colors.text, fontWeight: "800", fontSize: 13 }}>{rt.name}</Text>
                    <Text style={{ color: roomType?._id === rt._id ? "#fff" : colors.textMuted, fontSize: 11.5 }}>
                      {formatPriceINR(rt.pricePerHour ?? pricePerHour)}/hr
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Booking */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.secTitle, { color: colors.text }]}>Hourly booking</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12, paddingRight: 8 }}>
              {dateStrip(10).map(d => (
                <Pressable key={d.date} onPress={() => setDate(d.date)} style={[styles.dateChip, { backgroundColor: date === d.date ? colors.primary : colors.chipBg, borderColor: date === d.date ? colors.primary : colors.border }]}>
                  <Text style={{ color: date === d.date ? "#fff" : colors.textMuted, fontSize: 10.5, fontWeight: "700" }}>{d.dayName}</Text>
                  <Text style={{ color: date === d.date ? "#fff" : colors.text, fontSize: 15, fontWeight: "900" }}>{d.dayNum}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.gLabel, { color: colors.textMuted, marginTop: 12 }]}>Start</Text>
            {startSlotOptions.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {startSlotOptions.map(t => (
                  <Pressable key={t} onPress={() => setStartMin(t)} style={[styles.timeChip, { backgroundColor: startMin === t ? colors.primary : colors.chipBg, borderColor: startMin === t ? colors.primary : colors.border }]}>
                    <Text style={{ color: startMin === t ? "#fff" : colors.text, fontSize: 12.5, fontWeight: "700" }}>{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 2 }}>
                Aaj ke slots nikal chuke hain — kal ki date select karein.
              </Text>
            )}

            <Text style={[styles.gLabel, { color: colors.textMuted, marginTop: 12 }]}>Duration</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(h => {
                const under = roomType?.minDuration && h < roomType.minDuration;
                const over = roomType?.maxDuration && h > roomType.maxDuration;
                const dis = !!under || !!over;
                return (
                  <Pressable key={h} disabled={dis} onPress={() => setDuration(h)} style={[styles.timeChip, { backgroundColor: duration === h ? colors.primary : colors.chipBg, borderColor: duration === h ? colors.primary : colors.border, opacity: dis ? 0.4 : 1 }]}>
                    <Text style={{ color: duration === h ? "#fff" : colors.text, fontSize: 12.5, fontWeight: "700" }}>{h}h</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.gLabel, { color: colors.textMuted, marginTop: 12 }]}>Guests</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Pressable onPress={() => setGuests(g => Math.max(1, g - 1))} style={[styles.stepBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]} accessibilityLabel="Fewer guests">
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", minWidth: 26, textAlign: "center" }}>{guests}</Text>
              <Pressable onPress={() => setGuests(g => Math.min(roomType?.capacity || 8, g + 1))} style={[styles.stepBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]} accessibilityLabel="More guests">
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>

            {availLoading ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
            ) : avail ? (
              <Text style={{ marginTop: 14, fontSize: 12.5, color: canBook ? colors.success : colors.danger, fontWeight: "700" }}>
                {canBook
                  ? (avail.availableCount ?? slots.length) > 0 || slots.length > 0
                    ? `Available — ${avail.availableCount ?? slots.length} rooms free`
                    : "Availability looks fine"
                  : "Sold out for the selected time. Try another slot."}
              </Text>
            ) : (
              <Text style={{ marginTop: 14, fontSize: 12.5, color: colors.warning, fontWeight: "600" }}>
                Availability is checked live when confirming.
              </Text>
            )}

            {/* Price summary + book CTA */}
            <View style={[styles.priceCard, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10.5, fontWeight: "900", letterSpacing: 1 }}>ESTIMATED TOTAL</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
                    {formatPriceINR(pricePerHour)}/hr × {duration}h · {startMin}–{fmtMin(endTimeMins)}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "900" }}>{formatPriceINR(total)}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {["No prepayment", "Instant confirmation", "Free cancellation"].map(p => (
                  <View key={p} style={[styles.perk, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: colors.text }}>{p}</Text>
                  </View>
                ))}
              </View>
              <Button
                label={user ? `Book now · ${formatPriceINR(total)}` : "Sign in to book"}
                disabled={!user || todaySoldOut}
                onPress={() => {
                  if (!requireAuth("Sign in to book an hourly stay.")) return;
                  setSubmitError(null);
                  setConfirmOpen(true);
                }}
                style={{ marginTop: 12, height: 50, borderRadius: 14 }}
              />
            </View>
          </View>

          {stay.amenities && stay.amenities.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>Amenities</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {stay.amenities.map((a, i) => (
                  <View key={i} style={[styles.amenity, { backgroundColor: colors.chipBg }]}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Confirm sheet */}
        <BookingConfirmSheet
          visible={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          eyebrow="Hourly booking"
          title="Review & confirm"
          hero={{ icon: "time-outline", title: stay.name, subtitle: [stay.location, stay.city].filter(Boolean).join(", ") }}
          details={[
            { label: "Room type", value: roomType?.name || "Standard" },
            { label: "Date", value: date },
            { label: "Time slot", value: `${startMin} – ${fmtMin(endTimeMins)} (${duration}h)` },
            { label: "Guests", value: String(guests) },
          ]}
          total={{ value: formatPriceINR(total), sub: `${formatPriceINR(pricePerHour)} × ${duration} hours` }}
          perks={["Instant confirmation", "No prepayment", "Free cancellation"]}
          contact={contact}
          onContactChange={patch => setContact(p => ({ ...p, ...patch }))}
          errors={errors}
          showSpecial
          special={special}
          onSpecialChange={setSpecial}
          error={submitError}
          submitLabel={submitting ? "Confirming…" : "Confirm booking"}
          submitting={submitting}
          onSubmit={submit}
          footnote="Free cancellation. Pay at the property on check-in — nothing is charged online."
        />

        {/* Success */}
        <BookingSuccessSheet
          visible={!!done}
          status={done?.status}
          title={done ? `Room ${done.roomNumber} allotted` : ""}
          message="Your booking is confirmed. Show it in My Bookings at check-in."
          details={[
            ...(done?.bookingId ? [{ label: "Reference", value: bookingRef(done.bookingId) }] : []),
            { label: "Property name", value: stay.name },
            { label: "Date", value: date },
            { label: "Time", value: `${startMin} – ${fmtMin(endTimeMins)} (${duration}h)` },
            { label: "Total", value: formatPriceINR(total) },
          ]}
          onViewBookings={() => { setDone(null); navigation.navigate("Main", { screen: "Bookings" } as never); }}
          secondaryLabel="Done"
          onSecondary={() => { setDone(null); navigation.goBack(); }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { position: "absolute", top: 12, left: 12, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 20, fontWeight: "900" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 10 },
  secTitle: { fontSize: 15.5, fontWeight: "800" },
  roomChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110, gap: 2 },
  dateChip: { width: 52, height: 60, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  timeChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  gLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  priceCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 16 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perk: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  amenity: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
