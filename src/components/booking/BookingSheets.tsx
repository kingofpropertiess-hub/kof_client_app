import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { ModalSheet } from "../ui/ModalSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { bookingStatusMeta } from "../../utils/format";
import type { FieldErrors } from "../../utils/validation";

export interface BookingSummaryItem {
  label: string;
  value: string;
}

export interface BookingContact {
  name: string;
  email: string;
  phone: string;
}

interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Small caps kicker above the title, e.g. "Hourly stay" */
  eyebrow?: string;
  /** Sheet headline, defaults to "Review & confirm" */
  title?: string;
  /** What is being booked */
  hero: { icon: string; title: string; subtitle?: string };
  /** Key/value rows shown in the summary card */
  details?: BookingSummaryItem[];
  /** Optional emphasized total row */
  total?: { value: string; sub?: string };
  /** Small reassurance pills, e.g. "Instant confirmation" */
  perks?: string[];
  contact: BookingContact;
  onContactChange: (patch: Partial<BookingContact>) => void;
  errors?: FieldErrors;
  showSpecial?: boolean;
  special?: string;
  onSpecialChange?: (t: string) => void;
  /** Inline failure banner shown above the submit button (Alerts hide behind Modals on Android). */
  error?: string | null;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: () => void;
  /** Fine print under the submit button */
  footnote?: string;
}

/**
 * Shared, polished "review → confirm" bottom sheet used by every booking flow
 * (hourly stays and property site visits).
 */
export function BookingConfirmSheet({
  visible,
  onClose,
  eyebrow,
  title = "Review & confirm",
  hero,
  details,
  total,
  perks,
  contact,
  onContactChange,
  errors,
  showSpecial,
  special,
  onSpecialChange,
  error,
  submitLabel,
  submitting,
  onSubmit,
  footnote,
}: ConfirmSheetProps) {
  const { colors } = useTheme();

  return (
    <ModalSheet visible={visible} onClose={onClose} height="82%">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {eyebrow ? <Text style={[s.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>

        {/* Summary card */}
        <View style={[s.summary, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[s.heroIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name={hero.icon as never} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "800", fontSize: 14.5 }}>
                {hero.title}
              </Text>
              {hero.subtitle ? (
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
                  {hero.subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {details && details.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              {details.map((d, i) => (
                <View
                  key={`${d.label}-${i}`}
                  style={[s.kv, i < details.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : {}]}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>{d.label}</Text>
                  <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12.5, fontWeight: "700", maxWidth: 190, textAlign: "right" }}>
                    {d.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {total ? (
            <View style={[s.totalRow, { borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.4 }}>
                  PAYABLE
                </Text>
                {total.sub ? (
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{total.sub}</Text>
                ) : null}
              </View>
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "900" }}>{total.value}</Text>
            </View>
          ) : null}
        </View>

        {/* Perks */}
        {perks && perks.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {perks.map(p => (
              <View key={p} style={[s.perk, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{p}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Guest details */}
        <Text style={[s.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>YOUR DETAILS</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Input label="Full name" value={contact.name} onChangeText={t => onContactChange({ name: t })} error={errors?.name} />
          <Input label="Email" value={contact.email} onChangeText={t => onContactChange({ email: t })} error={errors?.email} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone" value={contact.phone} onChangeText={t => onContactChange({ phone: t })} error={errors?.phone} keyboardType="phone-pad" />
          {showSpecial ? (
            <Input label="Special requests (optional)" value={special || ""} onChangeText={t => onSpecialChange?.(t)} placeholder="Anything we should know?" />
          ) : null}
        </View>

        {/* Inline error banner — Alerts can render behind Modals on Android */}
        {error ? (
          <View style={[s.errBanner, { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.35)" }]}>
            <Ionicons name="warning" size={15} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 12.5, fontWeight: "700", flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <Button label={submitLabel} loading={submitting} disabled={submitting} onPress={onSubmit} style={{ marginTop: error ? 12 : 16, height: 52 }} />

        <View style={s.footnote}>
          <Ionicons name="shield-checkmark" size={13} color={colors.success} />
          <Text style={{ color: colors.textMuted, fontSize: 11.5, flex: 1 }}>
            {footnote || "Free cancellation. Pay at the property — your card is never charged here."}
          </Text>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

interface SuccessSheetProps {
  visible: boolean;
  onClose?: () => void;
  status?: string;
  title: string;
  message?: string;
  /** e.g. booking reference, allotted room, slot */
  details?: BookingSummaryItem[];
  onViewBookings: () => void;
  viewLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Shared "booking confirmed" celebration sheet.
 */
export function BookingSuccessSheet({
  visible,
  onClose,
  status,
  title,
  message,
  details,
  onViewBookings,
  viewLabel = "View my bookings",
  secondaryLabel,
  onSecondary,
}: SuccessSheetProps) {
  const { colors } = useTheme();
  const meta = status ? bookingStatusMeta(status) : null;

  return (
    <ModalSheet visible={visible} onClose={onClose || (() => {})} height="72%">
      <View style={{ alignItems: "center", paddingTop: 10 }}>
        <View style={[s.doneRing, { backgroundColor: "rgba(14,159,110,0.14)" }]}>
          <View style={[s.doneDot, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={30} color="#fff" />
          </View>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, marginTop: 14, textAlign: "center" }}>{title}</Text>
        {message ? (
          <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 13, marginTop: 6, paddingHorizontal: 12 }}>
            {message}
          </Text>
        ) : null}
        {meta ? (
          <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name="pulse" size={11} color={meta.color} />
            <Text style={{ color: meta.color, fontSize: 11.5, fontWeight: "800" }}>{meta.label}</Text>
          </View>
        ) : null}
      </View>

      {details && details.length > 0 ? (
        <View style={[s.doneCard, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
          {details.map((d, i) => (
            <View
              key={`${d.label}-${i}`}
              style={[s.kv, i < details.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : {}]}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>{d.label}</Text>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12.5, fontWeight: "700", maxWidth: 180, textAlign: "right" }}>
                {d.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button label={viewLabel} onPress={onViewBookings} style={{ marginTop: 16, height: 50 }} />
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} style={{ marginTop: 6, height: 46 }} />
      ) : null}
    </ModalSheet>
  );
}

/** Short human-friendly reference derived from a Mongo id. */
export function bookingRef(id?: string): string {
  if (!id) return "—";
  return `#${id.slice(-6).toUpperCase()}`;
}

const s = StyleSheet.create({
  eyebrow: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontSize: 18, fontWeight: "900", marginTop: 3 },
  summary: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  heroIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, gap: 12 },
  totalRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, marginTop: 4, paddingTop: 10 },
  perk: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  sectionLabel: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2 },
  footnote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 4, paddingHorizontal: 4 },
  doneRing: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  doneDot: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 10 },
  errBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  doneCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 14 },
});
