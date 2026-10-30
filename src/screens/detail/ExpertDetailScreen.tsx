import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuthGate } from "../../auth/useAuthGate";
import { StyleApi } from "../../lib/api";
import type { StyleExpert } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { SmartImage } from "../../components/ui/SmartImage";
import { StateView } from "../../components/ui/StateView";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import {
  styleAbout,
  styleExpertLocation,
  styleExpertPhoto,
  styleExperienceLong,
  stylePortfolio,
  stylePriceLabel,
  styleServices,
  styleSpecs,
  toISODate,
} from "../../utils/format";

/** Options mirror the web booking modal (src/app/style/[id]/page.tsx). */
const BUDGET_OPTS = ["Under ₹25,000", "₹25,000 - ₹50,000", "₹50,000 - ₹1 Lakh", "₹1 Lakh+"];
const TIME_OPTS = ["Morning (9 AM - 12 PM)", "Afternoon (12 PM - 4 PM)", "Evening (4 PM - 8 PM)"];

function buildDateOpts() {
  const now = new Date();
  const plus = (days: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() + days);
    return d;
  };
  // Next Saturday (or next week if today already is the weekend).
  const untilSat = (6 - now.getDay() + 7) % 7 || 7;
  return [
    { label: "Today", value: toISODate(now) },
    { label: "Tomorrow", value: toISODate(plus(1)) },
    { label: "This Weekend", value: toISODate(plus(untilSat)) },
    { label: "Next Week", value: toISODate(plus(7)) },
  ];
}
const DATE_OPTS = buildDateOpts();

function PickChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pickChip,
        {
          backgroundColor: selected ? colors.primary : colors.chipBg,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
    >
      <Text
        numberOfLines={1}
        style={[styles.pickChipTxt, { color: selected ? colors.onPrimary : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContactRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.contactRow}>
      <View style={[styles.contactIcon, { backgroundColor: colors.chipBg }]}>
        <Ionicons name={icon as never} size={15} color={valueColor || colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.contactValue, { color: valueColor || colors.text }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function ExpertDetailScreen() {
  const { colors, isDark } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = String(route.params?.id || "");
  const requireAuth = useAuthGate();

  const [expert, setExpert] = useState<StyleExpert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"about" | "services" | "portfolio">("about");
  const [viewer, setViewer] = useState<string | null>(null);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqDone, setReqDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestedService: "",
    location: "",
    budget: BUDGET_OPTS[1],
    preferredDate: DATE_OPTS[0].value,
    preferredTime: TIME_OPTS[0],
    description: "",
  });
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await StyleApi.getExpert(id);
      const prof = res.professional || res.expert || null;
      setExpert(prof);
      if (!prof) setError("The requested expert profile does not exist or has been updated.");
    } catch (e: unknown) {
      setExpert(null);
      setError(e instanceof Error ? e.message : "Failed to load this profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const services = expert ? styleServices(expert) : [];
  const portfolio = expert ? stylePortfolio(expert) : [];
  const specs = expert ? styleSpecs(expert) : [];
  const about = expert ? styleAbout(expert) : "";
  const photo = expert ? styleExpertPhoto(expert) : undefined;
  const verified = !!expert?.isVerified;
  const expLong = expert ? styleExperienceLong(expert) : null;
  const price = expert ? stylePriceLabel(expert) : null;
  const ratingLabel =
    expert && typeof expert.rating === "number" && !Number.isNaN(expert.rating)
      ? expert.rating.toFixed(1)
      : "—";
  const cardW = (Dimensions.get("window").width - 28 - 10) / 2;

  const openRequest = () => {
    if (!requireAuth("Sign in to request a design expert.")) return;
    if (!expert) return;
    setForm({
      requestedService: services[0] || expert.title || "Consultation",
      location: expert.location || expert.city || "",
      budget: BUDGET_OPTS[1],
      preferredDate: DATE_OPTS[0].value,
      preferredTime: TIME_OPTS[0],
      description: "",
    });
    setFormErr({});
    setReqDone(false);
    setReqOpen(true);
  };

  const submit = async () => {
    if (!expert) return;
    const errs: Record<string, string> = {};
    if (!form.requestedService.trim()) errs.requestedService = "Pick a service";
    if (!form.location.trim()) errs.location = "Project location is required";
    if (!form.preferredDate.trim()) errs.preferredDate = "Pick a preferred date";
    if (!form.description.trim()) errs.description = "Tell the expert what you need";
    setFormErr(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await StyleApi.createServiceRequest({
        professionalId: expert.id || expert._id || "",
        requestedService: form.requestedService,
        location: form.location.trim(),
        budget: form.budget,
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
        description: form.description.trim(),
      });
      setReqDone(true);
    } catch (err) {
      Alert.alert("Request failed", err instanceof Error ? err.message : "Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: "about" | "services" | "portfolio"; label: string }[] = [
    { key: "about", label: "About" },
    { key: "services", label: `Services (${services.length})` },
    { key: "portfolio", label: `Portfolio (${portfolio.length})` },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Back to Style Experts" onBack={() => nav.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !expert ? (
        <StateView
          visible
          kind="error"
          title="Expert profile not found"
          message={error || "The requested expert profile does not exist or has been updated."}
          onRetry={() => void load()}
          actionLabel="Back to Style Experts"
          onAction={() => nav.goBack()}
          style={{ borderRadius: 0 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* -------- Hero card: cover, avatar, meta, price, tabs -------- */}
          <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View>
              <SmartImage
                uri={expert.coverImage || portfolio[0] || photo}
                style={styles.cover}
                label="Cover"
              />
              <View style={styles.catPill}>
                <Text style={styles.catPillTxt}>{(expert.category || "expert").toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.avatarRow}>
              <View>
                <SmartImage uri={photo} style={styles.avatar} label="Profile" />
                {verified ? (
                  <View style={[styles.avatarCheck, { borderColor: colors.surface }]}>
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.heroBody}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {expert.name}
                </Text>
                {verified ? (
                  <View
                    style={[
                      styles.verPill,
                      {
                        backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
                        borderColor: isDark ? "rgba(16,185,129,0.4)" : "#A7F3D0",
                      },
                    ]}
                  >
                    <Text style={styles.verPillTxt}>Verified Expert</Text>
                  </View>
                ) : null}
              </View>

              {expert.title || expert.specialization ? (
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {expert.title || expert.specialization}
                </Text>
              ) : null}

              <View style={styles.metaWrap}>
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={13} color={colors.primary} />
                  <Text numberOfLines={1} style={[styles.metaTxt, { color: colors.text }]}>
                    {styleExpertLocation(expert)}
                  </Text>
                </View>
                {expLong ? (
                  <>
                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                    <View style={styles.metaItem}>
                      <Ionicons name="briefcase-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.metaTxt, { color: colors.text }]}>{expLong}</Text>
                    </View>
                  </>
                ) : null}
                <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={[styles.metaTxt, { color: colors.text, fontWeight: "900" }]}>
                    {ratingLabel}
                  </Text>
                  <Text style={[styles.metaTxt, { color: colors.textMuted, fontWeight: "600" }]}>
                    {" "}
                    ({expert.reviewCount ?? 0} reviews)
                  </Text>
                </View>
              </View>

              {/* Starting price + primary CTA */}
              <View style={[styles.ctaRow, { borderTopColor: colors.border }]}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.caps, { color: colors.textMuted }]}>STARTING FROM</Text>
                  <Text style={[styles.priceBig, { color: colors.primary }]} numberOfLines={2}>
                    {price || "Contact for price"}
                  </Text>
                </View>
                <Pressable
                  onPress={openRequest}
                  style={[styles.reqBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.reqBtnTxt}>Request Service</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* About / Services / Portfolio */}
            <View style={[styles.tabs, { borderTopColor: colors.border }]}>
              {tabs.map(t => {
                const on = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    style={[
                      styles.tabBtn,
                      on && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabTxt,
                        { color: on ? colors.primary : colors.textMuted, fontWeight: on ? "900" : "800" },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* -------- Tab content -------- */}
          {tab === "about" ? (
            <View style={{ gap: 12 }}>
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About {expert.name}</Text>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {about || "No details shared yet."}
                </Text>
              </View>

              {specs.length > 0 ? (
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Specializations</Text>
                  <View style={styles.specWrap}>
                    {specs.map((s, i) => (
                      <View
                        key={i}
                        style={[
                          styles.specChip,
                          {
                            backgroundColor: isDark ? colors.chipBg : "#FFF1F2",
                            borderColor: isDark ? colors.border : "#FFE4E6",
                          },
                        ]}
                      >
                        <Text style={[styles.specChipTxt, { color: colors.primary }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Expert Contact & Verification
                </Text>
                <ContactRow icon="call-outline" label="PHONE" value={expert.phone || "Not shared"} />
                <ContactRow icon="mail-outline" label="EMAIL" value={expert.email || "Not shared"} />
                <ContactRow
                  icon="shield-checkmark-outline"
                  label="STATUS"
                  value="King Verified Partner"
                  valueColor="#10B981"
                />
                <Button
                  label="Request Consultation"
                  onPress={openRequest}
                  style={{ height: 46, marginTop: 4 }}
                />
              </View>
            </View>
          ) : tab === "services" ? (
            services.length > 0 ? (
              <View style={styles.svcGrid}>
                {services.map((s, i) => (
                  <Pressable
                    key={i}
                    onPress={openRequest}
                    style={[
                      styles.svcCard,
                      { width: cardW, backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[styles.svcCheck, { backgroundColor: isDark ? colors.surfaceAlt : "#FFF1F2" }]}
                    >
                      <Ionicons name="checkmark" size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.svcName, { color: colors.text }]} numberOfLines={2}>
                      {s}
                    </Text>
                    <Text style={[styles.svcDesc, { color: colors.textMuted }]} numberOfLines={3}>
                      Customized solution crafted to your property dimensions and aesthetic
                      requirements.
                    </Text>
                    <Text style={[styles.svcBook, { color: colors.primary }]}>
                      Book this service →
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <StateView
                visible
                kind="empty"
                title="No services listed yet"
                message="This expert hasn't published services yet."
                style={{ borderRadius: 0, backgroundColor: colors.background }}
              />
            )
          ) : portfolio.length > 0 ? (
            <View style={{ gap: 12 }}>
              {portfolio.map((url, i) => (
                <Pressable
                  key={i}
                  onPress={() => setViewer(url)}
                  style={[styles.pfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SmartImage uri={url} style={styles.pfImg} label={`Project ${i + 1}`} />
                  <View style={styles.pfFooter}>
                    <Text style={[styles.pfTxt, { color: colors.text }]}>Project Showcase #{i + 1}</Text>
                    <Text style={[styles.pfHigh, { color: colors.primary }]}>View High Res</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <StateView
              visible
              kind="empty"
              title="No portfolio yet"
              message="Past projects will appear here soon."
              style={{ borderRadius: 0, backgroundColor: colors.background }}
            />
          )}
        </ScrollView>
      )}

      {/* Fullscreen portfolio viewer */}
      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          <Pressable style={styles.viewerClose} hitSlop={10} onPress={() => setViewer(null)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          {viewer ? (
            <Image source={{ uri: viewer }} style={styles.viewerImg} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>

      {/* Request Service sheet (fields match the backend contract) */}
      <ModalSheet visible={reqOpen} onClose={() => setReqOpen(false)} height="92%">
        {reqDone ? (
          <View style={styles.doneWrap}>
            <Ionicons name="checkmark-circle" size={46} color={colors.success} />
            <Text style={[styles.doneTitle, { color: colors.text }]}>Service Request Received!</Text>
            <Text style={[styles.doneMsg, { color: colors.textMuted }]}>
              Your request has been submitted to {expert?.name}. Our team and expert will reach out to
              you within 24 hours.
            </Text>
            <Button label="Done" onPress={() => setReqOpen(false)} style={{ marginTop: 8, minWidth: 150 }} />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            >
              <View style={[styles.reqHead, { borderBottomColor: colors.border }]}>
                <SmartImage uri={photo} style={styles.reqAvatar} label="Expert" />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.reqTitle, { color: colors.text }]}>
                    Request Service from {expert?.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.reqSub, { color: colors.textMuted }]}>
                    {expert?.title}
                  </Text>
                </View>
              </View>

              {services.length > 0 ? (
                <View>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Required Service / Craft</Text>
                  <View style={styles.pickWrap}>
                    {services.map(s => (
                      <PickChip
                        key={s}
                        label={s}
                        selected={form.requestedService === s}
                        onPress={() => setForm(p => ({ ...p, requestedService: s }))}
                      />
                    ))}
                  </View>
                  {formErr.requestedService ? (
                    <Text style={[styles.err, { color: colors.danger }]}>{formErr.requestedService}</Text>
                  ) : null}
                </View>
              ) : null}

              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Approximate Budget</Text>
                <View style={styles.pickWrap}>
                  {BUDGET_OPTS.map(b => (
                    <PickChip
                      key={b}
                      label={b}
                      selected={form.budget === b}
                      onPress={() => setForm(p => ({ ...p, budget: b }))}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Date</Text>
                <View style={styles.pickWrap}>
                  {DATE_OPTS.map(d => (
                    <PickChip
                      key={d.value}
                      label={d.label}
                      selected={form.preferredDate === d.value}
                      onPress={() => setForm(p => ({ ...p, preferredDate: d.value }))}
                    />
                  ))}
                </View>
                {formErr.preferredDate ? (
                  <Text style={[styles.err, { color: colors.danger }]}>{formErr.preferredDate}</Text>
                ) : null}
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Time</Text>
                <View style={styles.pickWrap}>
                  {TIME_OPTS.map(t => (
                    <PickChip
                      key={t}
                      label={t}
                      selected={form.preferredTime === t}
                      onPress={() => setForm(p => ({ ...p, preferredTime: t }))}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Project Location</Text>
                <Input
                  value={form.location}
                  onChangeText={t => setForm(p => ({ ...p, location: t }))}
                  error={formErr.location || null}
                  placeholder="e.g. Sukher, Udaipur"
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Project description *</Text>
                <TextInput
                  value={form.description}
                  onChangeText={t => setForm(p => ({ ...p, description: t }))}
                  multiline
                  textAlignVertical="top"
                  placeholder="Tell the expert what you need..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      borderColor: formErr.description ? colors.danger : colors.border,
                      color: colors.text,
                    },
                  ]}
                />
                {formErr.description ? (
                  <Text style={[styles.err, { color: colors.danger }]}>{formErr.description}</Text>
                ) : null}
              </View>

              <Button
                label="Send request"
                loading={submitting}
                disabled={submitting}
                onPress={submit}
                style={{ height: 50, marginTop: 4 }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  hero: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  cover: { width: "100%", height: 132 },
  catPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15,17,23,0.9)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catPillTxt: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  avatarRow: { marginTop: -34, paddingHorizontal: 14, flexDirection: "row" },
  avatar: { width: 78, height: 78, borderRadius: 18, borderWidth: 4, borderColor: "#FFFFFF" },
  avatarCheck: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  heroBody: { padding: 14, paddingTop: 10, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  name: { fontSize: 20, fontWeight: "900", lineHeight: 25, flexShrink: 1 },
  verPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  verPillTxt: { color: "#10B981", fontSize: 10, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    rowGap: 4,
    marginTop: 7,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "72%" },
  metaTxt: { fontSize: 12.5, fontWeight: "700" },
  metaDot: { fontSize: 12.5 },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  caps: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5 },
  priceBig: { fontSize: 18, fontWeight: "900", marginTop: 2 },
  reqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  reqBtnTxt: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  tabs: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabTxt: { fontSize: 12, fontWeight: "800" },

  section: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 15.5, fontWeight: "900" },
  body: { fontSize: 13, lineHeight: 20.5 },
  specWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specChip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  specChipTxt: { fontSize: 12, fontWeight: "700" },

  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  contactIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  contactValue: { fontSize: 13, fontWeight: "700", marginTop: 1 },

  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  svcCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 7 },
  svcCheck: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  svcName: { fontSize: 13.5, fontWeight: "800", lineHeight: 18 },
  svcDesc: { fontSize: 11.5, fontWeight: "500", lineHeight: 16 },
  svcBook: { fontSize: 11.5, fontWeight: "900", marginTop: 2 },

  pfCard: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  pfImg: { width: "100%", height: 200 },
  pfFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pfTxt: { fontSize: 12.5, fontWeight: "700" },
  pfHigh: { fontSize: 12, fontWeight: "900" },

  viewer: {
    flex: 1,
    backgroundColor: "rgba(8,10,16,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  viewerClose: { position: "absolute", top: 48, right: 16, padding: 8, zIndex: 2 },
  viewerImg: { width: "100%", height: "78%" },

  doneWrap: { alignItems: "center", paddingVertical: 26, gap: 10 },
  doneTitle: { fontSize: 18, fontWeight: "900" },
  doneMsg: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 320 },

  reqHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reqAvatar: { width: 46, height: 46, borderRadius: 23 },
  reqTitle: { fontSize: 14.5, fontWeight: "900" },
  reqSub: { fontSize: 11.5, fontWeight: "600", marginTop: 1 },

  formLabel: { fontSize: 13, fontWeight: "800", marginBottom: 7 },
  pickWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pickChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  pickChipTxt: { fontSize: 12, fontWeight: "700" },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 96,
    fontSize: 14.5,
  },
  err: { fontSize: 12, marginTop: 5, fontWeight: "600" },
});
