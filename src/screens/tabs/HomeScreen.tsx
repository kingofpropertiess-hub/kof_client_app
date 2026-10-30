import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { PropertyApi, StayApi } from "../../lib/api";
import type { Property, Stay } from "../../lib/types";
import { PropertyCard } from "../../components/PropertyCard";
import { StayCard } from "../../components/StayCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SmartImage } from "../../components/ui/SmartImage";
import { ListSkeleton, Skeleton } from "../../components/ui/Skeleton";
import { initialsOf } from "../../utils/format";

/** City artwork mirrors the web app's "Explore Cities" rail. */
const CITIES: { name: string; image: string }[] = [
  { name: "Udaipur", image: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Goa", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Jaipur", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Ahmedabad", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Mumbai", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Delhi", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Bangalore", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "Hyderabad", image: "https://images.unsplash.com/photo-1605379399642-870262d3d051?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
];

const NEARBY_BLUE = "#2563EB";
const NEARBY_BG = "#E2EDF8";

/**
 * Listing modes. "all" is the default view (stays + rental homes together);
 * the top filters and category chips switch the main list to one listing type.
 * The property-SALE business has been dropped from the app — properties here
 * are rental (To-Let) homes only.
 */
type Mode = "all" | "hourly" | "tolet" | "villas" | "hotels";

/** The only two filters shown above the listings (AI / visits / experts live in the footer tabs). */
const TOP_FILTERS: { key: Mode; label: string; icon: string }[] = [
  { key: "tolet", label: "To-Let Homes", icon: "people" },
  { key: "hourly", label: "Hourly · Hotels/Villas", icon: "time" },
];

const CATEGORIES: { key: Mode; label: string; icon: string }[] = [
  { key: "villas", label: "Villas", icon: "home" },
  { key: "hotels", label: "Hotels", icon: "business" },
  { key: "tolet", label: "To-Let Homes", icon: "people" },
];

const LIST_TITLES: Record<Mode, { title: string; subtitle: string }> = {
  all: { title: "All listings", subtitle: "Hotels, villas & rental homes — everything together" },
  hourly: { title: "Hotels & Villas", subtitle: "Book by the hour" },
  tolet: { title: "To-Let Homes", subtitle: "Zero-brokerage rental homes" },
  villas: { title: "Villas", subtitle: "Private villas for hourly stays" },
  hotels: { title: "Hotels", subtitle: "Partner hotels, bookable by the hour" },
};

// ---- tolerant property-type helpers (backend casing/"purpose" varies) ----
const isToLet = (p: Property) =>
  (p.listingType || "").toUpperCase().includes("TO_LET") ||
  /(to-?let|rent)/i.test((p.purpose || "").replace(/[\s_]/g, "-") || "");
const isVillaStay = (s: Stay) => /villa/i.test(`${s.type || ""} ${s.category || ""}`);

const LIVE_STAY_STATUS = ["PUBLISHED", "Active", "Published"];

export function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await PropertyApi.list({ limit: 40, sort: "newest", purpose: "to-let" });
      const props = (res.properties || []).filter(isToLet);
      setProperties(props);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load listings");
    }
    try {
      const raw = await StayApi.list();
      const list = Array.isArray(raw) ? raw : ((raw as unknown as { stays?: Stay[] }).stays || []);
      setStays((list || []).filter(s => !s.status || LIVE_STAY_STATUS.includes(s.status)));
    } catch {
      // Stays failing shouldn't hide the whole page; section quietly empties.
      setStays([]);
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

  const greeting = (() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    if (!user) return `${g}, Guest`;
    return user.fullName ? `${g}, ${user.firstName || user.fullName.split(" ")[0]}` : g;
  })();

  const goExplore = (params?: Record<string, string>) =>
    nav.navigate("Main" as never, { screen: "Explore", params } as never);

  const goStays = () => nav.navigate("Main" as never, { screen: "Stays" } as never);

  const openProperty = (p: Property) =>
    nav.navigate("PropertyDetail", { id: String(p._id ?? p.id) } as never);
  const openStay = (s: Stay) => nav.navigate("StayDetail", { id: String(s._id) } as never);

  const askAi = async () => {
    const q = aiPrompt.trim();
    if (!q) {
      nav.navigate("AiChat");
      return;
    }
    // Fast-track: send the query straight to the AI assistant.
    nav.navigate("AiChat", { seedMessage: q } as never);
  };

  const toggleMode = (next: Mode) => setMode(m => (m === next ? "all" : next));

  const trendingStays = useMemo(() => stays.slice(0, 8), [stays]);

  /** One mixed feed of stays + properties; stays are tagged so each renders with its own card. */
  type Offer = { key: string; kind: "stay"; data: Stay } | { key: string; kind: "property"; data: Property };

  const listOffers = useMemo<Offer[]>(() => {
    if (mode === "all") {
      return [
        ...stays.map(s => ({ key: `s-${String(s._id)}`, kind: "stay" as const, data: s })),
        ...properties.map(p => ({ key: `p-${String(p._id ?? p.id)}`, kind: "property" as const, data: p })),
      ];
    }
    const s =
      mode === "hourly"
        ? stays
        : mode === "hotels"
          ? stays.filter(s2 => /hotel/i.test(`${s2.type || ""} ${s2.category || ""}`))
          : mode === "villas"
            ? stays.filter(isVillaStay)
            : [];
    const p =
      mode === "tolet"
        ? properties
        : [];
    return [
      ...s.map(x => ({ key: `s-${String(x._id)}`, kind: "stay" as const, data: x })),
      ...p.map(x => ({ key: `p-${String(x._id ?? x.id)}`, kind: "property" as const, data: x })),
    ];
  }, [mode, stays, properties]);

  const listTitle = LIST_TITLES[mode];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable
            onPress={() => nav.navigate("Profile")}
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
            accessibilityLabel="Open profile"
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "800" }}>
              {initialsOf(user?.fullName)}
            </Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greet, { color: colors.textMuted }]}>{greeting}</Text>
            <Text style={[styles.brand, { color: colors.text }]}>
              King of <Text style={{ color: colors.primary }}>Properties</Text>
            </Text>
          </View>
          <Pressable onPress={() => nav.navigate("Notifications")} style={styles.iconBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => nav.navigate("Wishlist")} style={styles.iconBtn} accessibilityLabel="Wishlist">
            <Ionicons name="heart-outline" size={19} color={colors.text} />
          </Pressable>
        </View>

        {/* Explore cities */}
        <View style={{ marginBottom: 10 }}>
          <SectionHeader
            title="Explore Cities"
            actionLabel="View all"
            onAction={() => goExplore({})}
            style={{ paddingHorizontal: 14 }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityRail}
          >
            <Pressable
              onPress={() => {
                setSelectedCity(null);
                goExplore({});
              }}
              style={styles.cityItem}
              accessibilityRole="button"
              accessibilityLabel="Explore nearby cities"
            >
              <View
                style={[
                  styles.cityCircle,
                  {
                    backgroundColor: NEARBY_BG,
                    borderColor: selectedCity === null ? NEARBY_BLUE : "rgba(96,165,250,0.8)",
                  },
                  selectedCity === null ? styles.cityCircleActive : null,
                ]}
              >
                <Ionicons name="location" size={21} color={selectedCity === null ? NEARBY_BLUE : "#334155"} />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.cityLabel, { color: selectedCity === null ? NEARBY_BLUE : colors.text }]}
              >
                Nearby
              </Text>
            </Pressable>

            {CITIES.map(city => {
              const isSelected = selectedCity === city.name;
              return (
                <Pressable
                  key={city.name}
                  onPress={() => {
                    setSelectedCity(city.name);
                    goExplore({ city: city.name });
                  }}
                  style={styles.cityItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore properties in ${city.name}`}
                >
                  <View
                    style={[
                      styles.cityCircle,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: isSelected ? NEARBY_BLUE : colors.surface,
                      },
                      isSelected ? styles.cityCircleActive : null,
                    ]}
                  >
                    <SmartImage uri={city.image} label={city.name} style={styles.cityImage} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.cityLabel, { color: isSelected ? NEARBY_BLUE : colors.text }]}
                  >
                    {city.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder='Try "3 BHK flat in Delhi under 1 Cr"'
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            onSubmitEditing={askAi}
          />
          <Pressable onPress={askAi} style={styles.askBtn} accessibilityLabel="Search">
            <Ionicons name="sparkles" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* The only 3 filters (AI chat / site visits / design experts / inquiries live in the footer tabs) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { paddingHorizontal: 14 }]}
        >
          {TOP_FILTERS.map(f => {
            const active = mode === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => toggleMode(f.key)}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={f.icon as never} size={15} color={active ? colors.onPrimary : colors.primary} />
                <Text style={[styles.filterText, { color: active ? colors.onPrimary : colors.text }]} numberOfLines={1}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Block 1 — Trending hotels & villas */}
        {!loading && trendingStays.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            <SectionHeader
              title="Trending Hotels & Villas"
              subtitle="Rest for a few hours, book by the hour"
              actionLabel="See all"
              onAction={goStays}
              style={{ paddingHorizontal: 14 }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 4 }}>
              {trendingStays.map(s => (
                <StayCard key={String(s._id)} stay={s} horizontal onPress={() => openStay(s)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Block 2 — Trending rental homes (To-Let) */}
        {!loading && properties.length > 0 ? (
          <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
            <SectionHeader
              title="Top Rental Homes"
              subtitle="Verified homes & apartments available on rent"
              actionLabel="See all"
              onAction={() => toggleMode("tolet")}
            />
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 14 }}>
                {properties
                  .slice(0, 8)
                  .map(p => (
                    <PropertyCard key={String(p._id ?? p.id)} property={p} horizontal onPress={() => openProperty(p)} />
                  ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {/* Block 3 — Categories (tap to filter the list below) */}
        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <SectionHeader title="Categories" subtitle="Tap a category to see only those listings" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
            <View style={styles.pillRow}>
              {CATEGORIES.map(c => {
                const active = mode === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => toggleMode(c.key)}
                    style={[
                      styles.catPill,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={c.icon as never} size={15} color={active ? colors.onPrimary : colors.primary} />
                    <Text style={[styles.catText, { color: active ? colors.onPrimary : colors.text }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* All listings — everything together, filtered by the selected category/filter */}
        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <SectionHeader title={listTitle.title} subtitle={listTitle.subtitle} />
          {loading ? (
            <View style={{ flexDirection: "row" }}>
              <ListSkeleton count={2} horizontal />
              <ActivityIndicator size="small" style={{ marginLeft: 8, marginTop: 60 }} color={colors.primary} />
            </View>
          ) : error ? (
            <View style={[styles.errBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="cloud-offline-outline" size={26} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontWeight: "700", marginTop: 8 }}>{error}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12.5, textAlign: "center" }}>
                Check that the backend is reachable, then pull to refresh.
              </Text>
            </View>
          ) : (
            // 2-column grid — cards side by side, 2 per row
            listOffers.reduce<Offer[][]>((rows, offer, i) => {
              if (i % 2 === 0) rows.push([offer]);
              else rows[rows.length - 1].push(offer);
              return rows;
            }, []).map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map(offer => (
                  <View key={offer.key} style={styles.gridCell}>
                    {offer.kind === "stay" ? (
                      <StayCard stay={offer.data} onPress={() => openStay(offer.data)} />
                    ) : (
                      <PropertyCard property={offer.data} onPress={() => openProperty(offer.data)} />
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
          {!loading && !error && listOffers.length === 0 ? (
            <View style={[styles.errBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={24} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontWeight: "700", marginTop: 8 }}>No listings found</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12.5, textAlign: "center" }}>
                {mode === "hotels" || mode === "hourly"
                  ? "Partner hotels appear here as vendors add them."
                  : "Try a different category or pull to refresh."}
              </Text>
            </View>
          ) : null}
          {loading ? <View style={{ marginTop: 8 }}><Skeleton height={120} radius={16} /></View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },
  greet: { fontSize: 11.5, fontWeight: "600" },
  brand: { fontSize: 16.5, fontWeight: "900" },
  search: {
    marginHorizontal: 14, marginBottom: 10, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, gap: 7, minHeight: 42,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  askBtn: { backgroundColor: "#E11D48", borderRadius: 9, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  filterRow: { gap: 7, paddingBottom: 2 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: "700" },
  pillRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", alignItems: "center" },
  gridRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  gridCell: { flex: 1, minWidth: 0 },
  catPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  catText: { fontSize: 12, fontWeight: "700" },
  errBox: { alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1 },
  cityRail: { paddingHorizontal: 14, gap: 11, paddingTop: 2, paddingBottom: 2 },
  cityItem: { alignItems: "center", width: 58 },
  cityCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  cityCircleActive: { transform: [{ scale: 1.05 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  cityImage: { width: "100%", height: "100%" },
  cityLabel: { fontSize: 10.5, fontWeight: "700", marginTop: 5, textAlign: "center" },
});
