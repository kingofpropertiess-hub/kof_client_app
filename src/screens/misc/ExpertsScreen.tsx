import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeProvider";
import { StyleApi } from "../../lib/api";
import type { StyleExpert } from "../../lib/types";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { SmartImage } from "../../components/ui/SmartImage";
import { StateView } from "../../components/ui/StateView";
import { ModalSheet } from "../../components/ui/ModalSheet";
import {
  styleExpertKey,
  styleExpertLocation,
  styleExpertPhoto,
  styleExperienceShort,
  stylePriceLabel,
  styleSpecs,
} from "../../utils/format";

/** Category pills mirror the web marketplace (src/app/style/page.tsx). */
const CATEGORIES = [
  {
    id: "furniture",
    line1: "Furniture",
    line2: "Experts",
    label: "Furniture Experts",
    subtitle: "Skilled craftsmen & woodworkers",
    icon: "bed-outline" as const,
    tint: "#FFF1F2",
    accent: "#E11D48",
  },
  {
    id: "interior-designers",
    line1: "Interior",
    line2: "Designers",
    label: "Interior Designers",
    subtitle: "Creative professionals for your space",
    icon: "color-palette-outline" as const,
    tint: "#F5F3FF",
    accent: "#8B5CF6",
  },
  {
    id: "renovation",
    line1: "Renovation",
    line2: "Experts",
    label: "Renovation Experts",
    subtitle: "Trusted professionals for your space",
    icon: "hammer-outline" as const,
    tint: "#F0F9FF",
    accent: "#0284C7",
  },
];

type Opt = { value: string; label: string };
const CITY_OPTS: Opt[] = [
  { value: "All", label: "All Locations" },
  { value: "Udaipur", label: "Udaipur, Rajasthan" },
  { value: "Jaipur", label: "Jaipur, Rajasthan" },
  { value: "Jodhpur", label: "Jodhpur, Rajasthan" },
  { value: "Mumbai", label: "Mumbai, Maharashtra" },
  { value: "Delhi", label: "Delhi / NCR" },
];
const RATING_OPTS: Opt[] = [
  { value: "All", label: "All Ratings" },
  { value: "4.5", label: "4.5+ ★" },
  { value: "4.0", label: "4.0+ ★" },
];
const EXPERIENCE_OPTS: Opt[] = [
  { value: "All", label: "All Experience" },
  { value: "5", label: "5+ Years" },
  { value: "10", label: "10+ Years" },
];
const SORT_OPTS: Opt[] = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Rating: High to Low" },
  { value: "experience", label: "Experience: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

type PickTarget = "location" | "rating" | "experience" | "sort" | "filters" | null;

function FilterChip({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: string;
  iconColor: string;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
    >
      <Ionicons name={icon as never} size={11} color={iconColor} />
      <Text numberOfLines={1} style={[styles.chipTxt, { color: colors.text }]}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={9} color={colors.textMuted} />
    </Pressable>
  );
}

function OptRow({
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
      style={[styles.optRow, { borderBottomColor: colors.border }]}
      accessibilityRole="button"
    >
      <Text
        numberOfLines={1}
        style={[styles.optTxt, { color: selected ? colors.primary : colors.text }]}
      >
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={17} color={colors.primary} /> : null}
    </Pressable>
  );
}

function SheetTitle({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sheetTitle, { color: colors.text }]}>{text}</Text>;
}

function SheetLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sheetLabel, { color: colors.textMuted }]}>{text}</Text>;
}

export function ExpertsScreen() {
  const { colors, isDark } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  // Opened as the "Style" footer tab (no back arrow) vs. pushed from Home.
  const isTab = route.params?.tab === true;

  const [experts, setExperts] = useState<StyleExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Marketplace filters — same query contract as the web page.
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [city, setCity] = useState("All");
  const [minRating, setMinRating] = useState("All");
  const [minExperience, setMinExperience] = useState("All");
  const [sort, setSort] = useState("relevance");
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pick, setPick] = useState<PickTarget>(null);

  // Heart is a light local toggle (visual parity with the web card).
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const activeCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await StyleApi.listExperts({
        category,
        city,
        search: searchQuery,
        sort,
        minRating,
        minExperience,
      });
      setExperts(res.professionals || res.experts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load experts");
      setExperts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // A fresh list is fetched whenever a filter changes (like the web page).
  useEffect(() => {
    setExperts([]);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, city, minRating, minExperience, sort, searchQuery]);

  const resetFilters = () => {
    setCategory(CATEGORIES[0].id);
    setCity("All");
    setMinRating("All");
    setMinExperience("All");
    setSort("relevance");
    setSearchText("");
    setSearchQuery("");
    setPick(null);
  };

  const filtersActive =
    category !== CATEGORIES[0].id ||
    city !== "All" ||
    minRating !== "All" ||
    minExperience !== "All" ||
    sort !== "relevance" ||
    !!searchQuery;

  const commitSearch = () => {
    Keyboard.dismiss();
    setSearchQuery(searchText.trim());
    if (!searchText.trim()) setSearchOpen(false);
  };

  const cancelSearch = () => {
    Keyboard.dismiss();
    setSearchText("");
    setSearchQuery("");
    setSearchOpen(false);
  };

  const toggleHeart = (key: string) =>
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderHeader = () => (
    <View>
      {searchOpen ? (
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="search" size={14} color={colors.textMuted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={commitSearch}
              returnKeyType="search"
              autoFocus
              autoCapitalize="none"
              placeholder={`Search ${activeCat.label.toLowerCase()}...`}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchText ? (
              <Pressable onPress={() => setSearchText("")} hitSlop={6}>
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={cancelSearch} hitSlop={6}>
            <Text style={[styles.cancelTxt, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Category pills — Furniture / Interior / Renovation */}
      <View style={styles.tabs}>
        {CATEGORIES.map(cat => {
          const active = cat.id === category;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: active
                    ? isDark
                      ? "rgba(225,29,72,0.14)"
                      : cat.tint
                    : isDark
                      ? colors.surfaceAlt
                      : "#F8FAFC",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.tabIcon,
                  { backgroundColor: active ? colors.primary : isDark ? colors.surface : cat.tint },
                ]}
              >
                <Ionicons name={cat.icon} size={12} color={active ? "#FFFFFF" : cat.accent} />
              </View>
              <View style={{ minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={[styles.tabTxt, { color: active ? colors.primary : colors.text }]}
                >
                  {cat.line1}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.tabTxt, { color: active ? colors.primary : colors.text }]}
                >
                  {cat.line2}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Section heading + live expert count */}
      <View style={styles.sectionRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeCat.label}</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>{activeCat.subtitle}</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.countTxt, { color: colors.text }]}>{experts.length} Experts</Text>
        </View>
      </View>

      {/* Compact filter bar */}
      <View style={styles.filters}>
        <FilterChip icon="location" iconColor={colors.primary} label="Location" onPress={() => setPick("location")} />
        <FilterChip icon="star" iconColor="#F59E0B" label="Rating" onPress={() => setPick("rating")} />
        <FilterChip icon="briefcase-outline" iconColor={colors.textMuted} label="Experience" onPress={() => setPick("experience")} />
        <FilterChip icon="options" iconColor={colors.textMuted} label="Sort" onPress={() => setPick("sort")} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isTab ? "Style" : "Design & Style Experts"}
        subtitle={isTab ? "Find trusted experts for your space" : "Interior, architecture & styling pros"}
        onBack={isTab ? undefined : () => nav.goBack()}
        right={
          <View style={styles.headerBtns}>
            <Pressable
              onPress={() => (searchOpen ? cancelSearch() : setSearchOpen(true))}
              style={[styles.hbtn, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="Search experts"
            >
              <Ionicons name={searchOpen ? "close" : "search"} size={17} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => setPick("filters")}
              style={[styles.hbtn, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="Filter options"
            >
              <Ionicons name="options" size={17} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <FlatList
        data={loading ? [] : experts}
        keyExtractor={(x, i) => styleExpertKey(x) || String(i)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(true);
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <StateView
              visible
              kind="error"
              title="Couldn't load experts"
              message={error}
              onRetry={() => void load()}
              style={{ borderRadius: 0 }}
            />
          ) : (
            <StateView
              visible
              kind="empty"
              title="No experts found"
              message="Try adjusting your filters to explore more available experts."
              actionLabel={filtersActive ? "Clear filters" : undefined}
              onAction={filtersActive ? resetFilters : undefined}
              style={{ borderRadius: 0, backgroundColor: colors.background }}
            />
          )
        }
        renderItem={({ item }) => {
          const key = styleExpertKey(item);
          const saved = savedIds.has(key);
          const expLabel = styleExperienceShort(item);
          const price = stylePriceLabel(item);
          const specs = styleSpecs(item);
          const ratingLabel =
            typeof item.rating === "number" && !Number.isNaN(item.rating)
              ? item.rating.toFixed(1)
              : "—";
          return (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => nav.navigate("ExpertDetail", { id: key })}
              accessibilityRole="button"
            >
              <Pressable
                style={styles.heart}
                hitSlop={10}
                onPress={() => toggleHeart(key)}
                accessibilityLabel="Save expert"
              >
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={16}
                  color={saved ? colors.primary : "#CBD5E1"}
                />
              </Pressable>

              <View style={styles.cardRow}>
                <View>
                  <SmartImage uri={styleExpertPhoto(item)} label="Expert" style={styles.cardImg} />
                  {item.isVerified !== false ? (
                    <View style={styles.verBadge}>
                      <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                      <Text style={styles.verTxt}>Verified</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardInfo}>
                  <Text numberOfLines={1} style={[styles.cardName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {item.title || item.specialization ? (
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.textMuted }]}>
                      {item.title || item.specialization}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Ionicons name="location" size={11} color={colors.primary} />
                    <Text numberOfLines={1} style={[styles.metaTxt, { color: colors.textMuted }]}>
                      {styleExpertLocation(item)}
                    </Text>
                    {expLabel ? (
                      <>
                        <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                        <Ionicons name="briefcase-outline" size={11} color={colors.textMuted} />
                        <Text style={[styles.metaTxt, { color: colors.textMuted }]}>{expLabel}</Text>
                      </>
                    ) : null}
                  </View>

                  <View style={styles.rateRow}>
                    <View style={styles.rateLeft}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={[styles.rateNum, { color: colors.text }]}>{ratingLabel}</Text>
                      <Text style={[styles.rateCnt, { color: colors.textMuted }]}>
                        ({item.reviewCount ?? 0})
                      </Text>
                    </View>
                    {price ? (
                      <Text numberOfLines={1} style={[styles.price, { color: colors.primary }]}>
                        {price}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.tagRow, { borderTopColor: colors.border }]}>
                    <View style={styles.tagList}>
                      {specs.slice(0, 2).map((s, i) => (
                        <Text
                          key={i}
                          numberOfLines={1}
                          style={[styles.tag, { backgroundColor: colors.chipBg, color: colors.text, borderColor: colors.border }]}
                        >
                          {s}
                        </Text>
                      ))}
                    </View>
                    <View style={[styles.viewBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.viewTxt}>View Profile</Text>
                      <Ionicons name="arrow-forward" size={9} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Filter pickers (single or all-in-one, like the web drawer) */}
      <ModalSheet
        visible={pick !== null}
        onClose={() => setPick(null)}
        height={pick === "filters" ? "72%" : "45%"}
      >
        <View>
          <SheetTitle
            text={
              pick === "location"
                ? "Location"
                : pick === "rating"
                  ? "Rating"
                  : pick === "experience"
                    ? "Experience"
                    : pick === "sort"
                      ? "Sort by"
                      : `Filter ${activeCat.label}`
            }
          />

          {(pick === "location" || pick === "filters") && (
            <View>
              <SheetLabel text="CITY / LOCATION" />
              {CITY_OPTS.map(o => (
                <OptRow
                  key={o.value}
                  label={o.label}
                  selected={city === o.value}
                  onPress={() => {
                    setCity(o.value);
                    if (pick !== "filters") setPick(null);
                  }}
                />
              ))}
            </View>
          )}

          {(pick === "rating" || pick === "filters") && (
            <View>
              <SheetLabel text="MIN RATING" />
              {RATING_OPTS.map(o => (
                <OptRow
                  key={o.value}
                  label={o.label}
                  selected={minRating === o.value}
                  onPress={() => {
                    setMinRating(o.value);
                    if (pick !== "filters") setPick(null);
                  }}
                />
              ))}
            </View>
          )}

          {(pick === "experience" || pick === "filters") && (
            <View>
              <SheetLabel text="MIN EXPERIENCE" />
              {EXPERIENCE_OPTS.map(o => (
                <OptRow
                  key={o.value}
                  label={o.label}
                  selected={minExperience === o.value}
                  onPress={() => {
                    setMinExperience(o.value);
                    if (pick !== "filters") setPick(null);
                  }}
                />
              ))}
            </View>
          )}

          {(pick === "sort" || pick === "filters") && (
            <View>
              <SheetLabel text="SORT BY" />
              {SORT_OPTS.map(o => (
                <OptRow
                  key={o.value}
                  label={o.label}
                  selected={sort === o.value}
                  onPress={() => {
                    setSort(o.value);
                    if (pick !== "filters") setPick(null);
                  }}
                />
              ))}
            </View>
          )}

          {pick === "filters" ? (
            <View style={styles.sheetActions}>
              <Pressable
                onPress={resetFilters}
                style={[styles.sheetBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.sheetBtnTxt, { color: colors.text }]}>Clear All</Text>
              </Pressable>
              <Pressable
                onPress={() => setPick(null)}
                style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.sheetBtnTxt, { color: colors.onPrimary }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtns: { flexDirection: "row", gap: 8 },
  hbtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 8,
    flexGrow: 1,
  },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: "600", paddingVertical: 0 },
  cancelTxt: { fontSize: 12, fontWeight: "800" },

  tabs: { flexDirection: "row", gap: 6, marginBottom: 10 },
  tab: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  tabIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabTxt: { fontSize: 10, fontWeight: "900", lineHeight: 12 },

  sectionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 14.5, fontWeight: "900", lineHeight: 18 },
  sectionSub: { fontSize: 9.5, fontWeight: "500", marginTop: 1.5 },
  countPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 2,
  },
  countTxt: { fontSize: 9.5, fontWeight: "800" },

  filters: { flexDirection: "row", gap: 4, marginBottom: 4 },
  chip: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 9.5, fontWeight: "900" },

  card: { borderWidth: 1, borderRadius: 16, padding: 10 },
  cardRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  cardImg: { width: 80, height: 80, borderRadius: 12 },
  verBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  verTxt: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
  cardInfo: { flex: 1, minWidth: 0, paddingRight: 18 },
  cardName: { fontSize: 13, fontWeight: "900", lineHeight: 16 },
  cardTitle: { fontSize: 10.5, fontWeight: "600", marginTop: 1.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3.5 },
  metaTxt: { fontSize: 10, fontWeight: "600", flexShrink: 1 },
  metaDot: { fontSize: 10 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 3.5,
  },
  rateLeft: { flexDirection: "row", alignItems: "center", gap: 3 },
  rateNum: { fontSize: 10.5, fontWeight: "900" },
  rateCnt: { fontSize: 9.5, fontWeight: "500" },
  price: { fontSize: 10.5, fontWeight: "900", flexShrink: 1, textAlign: "right" },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tagList: { flexDirection: "row", gap: 4, flex: 1, minWidth: 0 },
  tag: {
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    overflow: "hidden",
    maxWidth: 90,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewTxt: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  heart: { position: "absolute", top: 8, right: 8, padding: 4, zIndex: 2 },

  sheetTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 },
  sheetLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, marginTop: 12, marginBottom: 2 },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optTxt: { fontSize: 13.5, fontWeight: "700", flex: 1 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetBtnTxt: { fontSize: 13, fontWeight: "800" },
});
