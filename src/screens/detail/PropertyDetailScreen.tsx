import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useAuthGate } from "../../auth/useAuthGate";
import { BookingApi, PropertyApi, WishlistApi, InquiryApi } from "../../lib/api";
import type { Property, PropertySlot, Booking } from "../../lib/types";
import { SmartImage } from "../../components/ui/SmartImage";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { StateView } from "../../components/ui/StateView";
import { BookingConfirmSheet, BookingSuccessSheet, bookingRef } from "../../components/booking/BookingSheets";
import { dateStrip, toISODate, formatSlotLabel } from "../../utils/format";
import { FieldErrors, hasErrors, validateContact } from "../../utils/validation";

export function PropertyDetailScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const id = route.params?.id;
  const { user } = useAuth();
  const requireAuth = useAuthGate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);

  // Gallery
  const [galleryIdx, setGalleryIdx] = useState(0);

  // Slot booking
  const [slotDate, setSlotDate] = useState<string>(toISODate(new Date()));
  const [slots, setSlots] = useState<PropertySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PropertySlot | null>(null);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);

  // Booking confirm
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState<Booking | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  // Inquiry
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryDone, setInquiryDone] = useState(false);

  // Wishlist
  const [saved, setSaved] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const p = await PropertyApi.get(id);
        setProperty(p);
        if (user) {
          setForm({ name: user.fullName || "", email: user.email || "", phone: user.phone || "" });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load property");
      } finally {
        setLoading(false);
      }
    })();
    // Prefill is intentionally re-run only when the identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?._id]);

  useEffect(() => {
    (async () => {
      if (!id || !property) return;
      setSlotsLoading(true);
      setSlotsErr(null);
      setSelectedSlot(null);
      try {
        const res = await PropertyApi.slots(id, slotDate);
        setSlots(res.slots || []);
        if (res.isDayAvailable === false) setSlotsErr(`Closed on ${res.dayName || "this day"}`);
      } catch (e: unknown) {
        setSlots([]);
        setSlotsErr(e instanceof Error ? e.message : "Failed to load slots");
      } finally {
        setSlotsLoading(false);
      }
    })();
    // Slots are keyed by property id + date only; the document object itself is
    // intentionally not a dependency (it changes identity on every fetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slotDate, property?._id]);

  const images = useMemo(() => {
    if (!property) return [];
    const list = property.images?.length ? property.images : property.image ? [property.image] : [];
    return list;
  }, [property]);

  const submitVisitBooking = async () => {
    if (!property || !selectedSlot) return;
    const e = validateContact(form);
    setFormErrors(e);
    if (hasErrors(e)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await BookingApi.create({
        propertyId: property._id,
        propertyTitle: property.title,
        vendorId: property.vendorId,
        bookingDate: slotDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        slotLabel: selectedSlot.slotLabel,
        selectedSlots: [{ startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, slotLabel: selectedSlot.slotLabel }],
        guests: 1,
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),
      });
      if (res?.booking) {
        setBookingDone(res.booking);
        setConfirmOpen(false);
        setSlots(prev => prev.map(s => (s.slotLabel === selectedSlot.slotLabel ? { ...s, status: "Booked" } : s)));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      console.log("[visit booking] failed:", err);
      // Keep the sheet open and show the reason inline (Alert hides behind Modal on Android).
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitInquiry = async () => {
    if (!property) return;
    const e = validateContact(form);
    setFormErrors(e);
    if (hasErrors(e) || !inquiryMsg.trim()) return;
    setInquirySubmitting(true);
    try {
      await InquiryApi.create({
        propertyId: property._id,
        propertyTitle: property.title,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: inquiryMsg.trim(),
      });
      setInquiryDone(true);
      setInquiryMsg("");
    } catch (err) {
      Alert.alert("Inquiry failed", err instanceof Error ? err.message : "Could not send inquiry");
    } finally {
      setInquirySubmitting(false);
    }
  };

  const toggleWishlist = async () => {
    if (!requireAuth("Sign in to save this property to your wishlist.")) return;
    if (!property) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await WishlistApi.add(property._id);
      else await WishlistApi.remove(property._id);
    } catch {
      setSaved(!next);
    }
  };

  useEffect(() => {
    (async () => {
      if (!property || !user) return;
      try {
        const res = await WishlistApi.ids();
        const rawList = res.ids || res.savedPropertyIds || [];
        setSaved((rawList as unknown[]).map(String).includes(String(property._id)));
      } catch {}
    })();
  }, [property, user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !property) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <StateView visible kind="error" title="Couldn't load property" message={error || "Not found"} onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const facts = [
    { icon: "bed-outline", label: "Bedrooms", value: String(property.bhk || property.bedrooms || "—") },
    { icon: "water-outline", label: "Bathrooms", value: String(property.bathrooms || "—") },
    { icon: "resize-outline", label: "Area", value: property.area || `${property.areaSize ?? "—"} sq.ft` },
    { icon: "business-outline", label: "Type", value: property.type || property.propertyType || "—" },
    { icon: "pricetag-outline", label: "Category", value: property.category || "—" },
    { icon: "male-female-outline", label: "Furnishing", value: property.furnishing || "—" },
  ];

  const g = () => galleryIdx % Math.max(images.length, 1);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Gallery header */}
        <View>
          <SmartImage uri={images[g()]} label="Property photo" style={{ width: "100%", height: 265 }} />
          {images.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {images.slice(0, 10).map((im, i) => (
                <Pressable key={i} onPress={() => setGalleryIdx(i)}>
                  <SmartImage
                    uri={im}
                    style={[
                      styles.thumb,
                      galleryIdx % images.length === i
                        ? { borderColor: colors.primary, borderWidth: 2 }
                        : {},
                    ] as any}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={toggleWishlist} style={[styles.heartBtn, { backgroundColor: colors.surface }]} accessibilityLabel="Save">
            <Ionicons name={saved ? "heart" : "heart-outline"} size={21} color={saved ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 8 }} showsVerticalScrollIndicator={false}>
          {/* Title row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                <Ionicons name="location-sharp" size={14} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13.5 }} numberOfLines={1}>
                  {[property.locality, property.city, property.state].filter(Boolean).join(", ")}
                </Text>
              </View>
            </View>
            <Text style={[styles.price, { color: colors.primary }]}>{property.priceLabel || `₹${property.price}`}</Text>
          </View>

          {/* badges */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {property.isVerified ? (
              <View style={[styles.badge, { backgroundColor: "rgba(14,159,110,0.12)" }]}><Text style={{ color: colors.success, fontSize: 11.5, fontWeight: "800" }}>✓ Verified</Text></View>
            ) : null}
            {property.isFeatured ? (
              <View style={[styles.badge, { backgroundColor: "rgba(225,29,72,0.12)" }]}><Text style={{ color: colors.primary, fontSize: 11.5, fontWeight: "800" }}>★ Featured</Text></View>
            ) : null}
            {property.isZeroBrokerage ? <View style={[styles.badge, { backgroundColor: colors.chipBg }]}><Text style={{ color: colors.text, fontSize: 11.5, fontWeight: "700" }}>No Brokerage</Text></View> : null}
            {property.brokerage && property.brokerage !== "No Brokerage" ? <View style={[styles.badge, { backgroundColor: colors.chipBg }]}><Text style={{ color: colors.textMuted, fontSize: 11.5, fontWeight: "700" }}>{property.brokerage}</Text></View> : null}
            {property.tenantPreference ? <View style={[styles.badge, { backgroundColor: colors.chipBg }]}><Text style={{ color: colors.textMuted, fontSize: 11.5, fontWeight: "700" }}>Prefers: {property.tenantPreference}</Text></View> : null}
          </View>

          {/* key facts grid */}
          <View style={[styles.factsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {facts.map((f, i) => (
              <View key={i} style={styles.fact}>
                <Ionicons name={f.icon as never} size={17} color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 5 }}>{f.label}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }} numberOfLines={1}>{f.value}</Text>
              </View>
            ))}
          </View>

          {/* rental specifics */}
          {property.listingType === "TO_LET" || property.purpose === "rent" || property.purpose === "to-let" ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { l: "Monthly rent", v: property.monthlyRent ? `₹${property.monthlyRent.toLocaleString("en-IN")}` : "—" },
                { l: "Security deposit", v: property.securityDeposit || "—" },
                { l: "Maintenance", v: property.maintenance || "—" },
                { l: "Available from", v: property.availableFrom || "—" },
                { l: "Parking", v: property.parking || "—" },
              ].map((r, i) => (
                <View key={i} style={[styles.kv, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.l}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{r.v}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* description */}
          {property.description ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>About this property</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13.5, lineHeight: 21, marginTop: 6 }}>{property.description}</Text>
            </View>
          ) : null}

          {/* amenities */}
          {property.amenities && property.amenities.length > 0 ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>Amenities</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {property.amenities.map((a, i) => (
                  <View key={i} style={[styles.amenity, { backgroundColor: colors.chipBg }]}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Slot booking */}
          {property.isTimeSlotEnabled !== false && property.bookingType !== "Full Day" ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>Book a site visit</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 3 }}>Pick a date to see live slot availability.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
                {dateStrip(14).map(d => (
                  <Pressable key={d.date} onPress={() => setSlotDate(d.date)} style={[styles.dateChip, { backgroundColor: slotDate === d.date ? colors.primary : colors.chipBg }, { borderColor: slotDate === d.date ? colors.primary : colors.border }]}>
                    <Text style={{ color: slotDate === d.date ? "#fff" : colors.textMuted, fontSize: 10.5, fontWeight: "700" }}>{d.dayName}</Text>
                    <Text style={{ color: slotDate === d.date ? "#fff" : colors.text, fontSize: 15, fontWeight: "900" }}>{d.dayNum}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {slotsLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}><ActivityIndicator color={colors.primary} /></View>
              ) : slotsErr ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.warning, fontSize: 13 }}>{slotsErr}</Text>
                </View>
              ) : slots.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 12 }}>No slots configured for this day.</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {slots.map(sl => {
                    const dis = sl.status !== "Available";
                    const sel = selectedSlot?.slotLabel === sl.slotLabel;
                    return (
                      <Pressable
                        key={sl.slotLabel}
                        disabled={dis}
                        onPress={() => setSelectedSlot(sl)}
                        style={[styles.slot, { backgroundColor: sel ? colors.primary : dis ? colors.surfaceAlt : colors.chipBg, borderColor: sel ? colors.primary : colors.border, opacity: dis ? 0.55 : 1 }]}
                      >
                        <Text style={{ color: sel ? "#fff" : dis ? colors.textMuted : colors.text, fontSize: 12, fontWeight: "700" }}>{formatSlotLabel(sl.slotLabel)}</Text>
                        {!dis && sl.status === "Booked" ? null : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Button
                label={user ? "Continue visit booking" : "Sign in to book a visit"}
                disabled={!selectedSlot}
                onPress={() => {
                  if (!requireAuth("Sign in to book a site visit.")) return;
                  setSubmitError(null);
                  setConfirmOpen(true);
                }}
                style={{ marginTop: 16, height: 50 }}
              />
            </View>
          ) : null}

          {/* Send inquiry */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.secTitle, { color: colors.text }]}>Contact the seller</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 3 }}>
              Listed by {property.postedBy || "Owner"} · Dealer: {property.dealer || "King of Properties"}
            </Text>
            <Button
              label={inquiryDone ? "Inquiry sent ✓" : "Send an inquiry"}
              variant="outline"
              onPress={() => {
                if (!requireAuth("Sign in to contact the seller.")) return;
                setInquiryOpen(true);
              }}
              style={{ marginTop: 12, height: 48 }}
            />
          </View>
        </ScrollView>

        {/* Sticky CTA bar */}
        <View style={[styles.ctaBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 12 + 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11.5 }}>Site visit</Text>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
              {selectedSlot ? `${selectedSlot.startTime} · ${slotDate}` : "Select a slot"}
            </Text>
          </View>
          <Button
            label={selectedSlot ? "Book visit" : "Pick a slot first"}
            disabled={!selectedSlot}
            onPress={() => {
              if (!requireAuth("Sign in to book a site visit.")) return;
              setSubmitError(null);
              setConfirmOpen(true);
            }}
            style={{ width: 150, height: 46, borderRadius: 999 }}
          />
        </View>

        {/* Confirm modal */}
        <BookingConfirmSheet
          visible={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          eyebrow="Site visit"
          title="Review & confirm"
          hero={{ icon: "calendar-outline", title: property.title, subtitle: [property.locality, property.city].filter(Boolean).join(", ") }}
          details={[
            { label: "Visit date", value: slotDate },
            { label: "Time slot", value: formatSlotLabel(selectedSlot?.slotLabel || "") },
            { label: "Dealer", value: property.dealer || "Owner" },
          ]}
          total={{ value: "Free", sub: "Site visits don't require any payment" }}
          perks={["No payment needed", "Free reschedule", "Instant confirmation"]}
          contact={{ name: form.name, email: form.email, phone: form.phone }}
          onContactChange={patch => setForm(p => ({ ...p, ...patch }))}
          errors={formErrors}
          error={submitError}
          submitLabel={submitting ? "Confirming…" : "Confirm visit"}
          submitting={submitting}
          onSubmit={submitVisitBooking}
          footnote="No payment is charged now. You'll only pay if the vendor confirms a paid plan."
        />

        {/* Booking success */}
        <BookingSuccessSheet
          visible={!!bookingDone}
          status={bookingDone?.bookingStatus}
          title="Visit booked!"
          message="Your site visit is booked. The vendor has been notified — see you there!"
          details={[
            ...(bookingDone?._id ? [{ label: "Reference", value: bookingRef(bookingDone._id) }] : []),
            { label: "Property", value: bookingDone?.propertyTitle || property.title },
            { label: "Date & slot", value: `${slotDate} · ${formatSlotLabel(selectedSlot?.slotLabel || "")}` },
          ]}
          onViewBookings={() => { setBookingDone(null); navigation.navigate("Main", { screen: "Bookings" } as never); }}
          secondaryLabel="Done"
          onSecondary={() => { setBookingDone(null); navigation.goBack(); }}
        />

        {/* Inquiry modal */}
        <ModalSheet visible={inquiryOpen} onClose={() => setInquiryOpen(false)} title="Send inquiry">
          {inquiryDone ? (
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
              <Ionicons name="mail-open" size={36} color={colors.success} />
              <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>Inquiry sent!</Text>
              <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 13 }}>The owner/vendor will reply to your account. Track it under My Inquiries.</Text>
              <Button label="Done" onPress={() => { setInquiryDone(false); setInquiryOpen(false); }} style={{ marginTop: 10, minWidth: 150 }} />
            </View>
          ) : (
            <>
              <Input label="Name" value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} error={formErrors.name} />
              <Input label="Email" value={form.email} onChangeText={t => setForm(p => ({ ...p, email: t }))} error={formErrors.email} />
              <Input label="Phone" value={form.phone} onChangeText={t => setForm(p => ({ ...p, phone: t }))} error={formErrors.phone} />
              <Text style={[styles.sheetLabel, { color: colors.text }]}>Message</Text>
              <TextInput
                value={inquiryMsg}
                onChangeText={setInquiryMsg}
                multiline
                numberOfLines={4}
                placeholder="Hi, I'm interested in this property. Is it still available?"
                placeholderTextColor={colors.textMuted}
                style={[styles.msgBox, { backgroundColor: colors.chipBg, borderColor: colors.border, color: colors.text }]}
              />
              <Button label="Send inquiry" loading={inquirySubmitting} disabled={inquirySubmitting} onPress={submitInquiry} style={{ marginTop: 14, height: 50 }} />
            </>
          )}
        </ModalSheet>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  thumbs: { position: "absolute", bottom: 10, left: 0, right: 0 },
  thumb: { width: 62, height: 46, borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
  backBtn: { position: "absolute", top: 12, left: 12, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  heartBtn: { position: "absolute", top: 12, right: 12, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 19, fontWeight: "900", flex: 1 },
  price: { fontSize: 18, fontWeight: "900" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  factsCard: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderRadius: 16, marginTop: 12, padding: 4 },
  fact: { width: "33%", alignItems: "center", paddingVertical: 12 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  secTitle: { fontSize: 15.5, fontWeight: "800" },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1 },
  amenity: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dateChip: { width: 52, height: 60, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  slot: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  ctaBar: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  sheetLabel: { fontSize: 13, fontWeight: "700", marginTop: 6, marginBottom: 6 },
  msgBox: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14.5, textAlignVertical: "top", minHeight: 100 },
});
