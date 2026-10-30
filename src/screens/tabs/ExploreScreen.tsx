import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeProvider";
import { PropertyApi, type PropertyQuery } from "../../lib/api";
import type { Property } from "../../lib/types";
import { PropertyCard } from "../../components/PropertyCard";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { StateView } from "../../components/ui/StateView";
import { PropertyCardSkeleton } from "../../components/ui/Skeleton";

const TYPES = ["Apartment", "Flat", "Builder Floor", "Independent House", "Villa", "Plot"];
const BHK = ["1", "2", "3", "4", "5+"];
const SORTS = [
  { id: "", label: "Relevance" },
  { id: "newest", label: "Newest first" },
  { id: "price_asc", label: "Price: Low → High" },
  { id: "price_desc", label: "Price: High → Low" },
];
const PAGE_SIZE = 12;

interface Filters {
  search: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  bhk: string[];
  types: string[];
  sort: string;
  onlyVerified: boolean;
  zeroBrokerage: boolean;
}

const EMPTY: Filters = {
  search: "", city: "", minPrice: "", maxPrice: "",
  bhk: [], types: [], sort: "", onlyVerified: false, zeroBrokerage: false,
};

export function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const nav = useNavigation<any>();

  // The To-Let footer tab reuses this screen. The whole screen is rentals-only
  // now — the property-SALE business has been dropped from the app.
  const lockedPurpose = route.params?.lockedPurpose === true;

  const [filters, setFilters] = useState<Filters>({
    ...EMPTY,
    search: route.params?.search || "",
    city: "",
  });
  const [items, setItems] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  // Keystrokes are debounced before they hit the query so typing doesn't fire
  // one request per character.
  const [searchText, setSearchText] = useState(route.params?.search || "");

  // Apply route params passed while the screen is already mounted (tab params).
  useEffect(() => {
    const sp = route.params;
    if (sp) {
      if (sp.search !== undefined) setSearchText(sp.search);
      setFilters(p => ({
        ...p,
        search: sp.search ?? p.search,
      }));
    }
    // Read individual params so navigating again with new values re-applies them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(p => (p.search === searchText ? p : { ...p, search: searchText }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const query = useMemo<PropertyQuery>(() => {
    const q: PropertyQuery = {
      search: filters.search.trim() || undefined,
      city: filters.city || undefined,
      purpose: "to-let", // rentals only — sale listings are not shown in the app
      sort: filters.sort || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      bhk: filters.bhk.join(",") || undefined,
      types: filters.types.join(",") || undefined,
      onlyVerified: filters.onlyVerified || undefined,
      page: 1,
      limit: PAGE_SIZE,
    };
    if (filters.zeroBrokerage) q.brokerage = "No Brokerage";
    return q;
  }, [filters]);

  const load = useCallback(
    async (pNext = 1, append = false, silent = false) => {
      if (silent) setMore(true);
      else if (append) setMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await PropertyApi.list({ ...query, page: pNext });
        const list = res.properties || [];
        setTotal(res.total || list.length);
        setItems(prev => (append ? [...prev, ...list] : list));
        setPage(pNext);
      } catch (e: unknown) {
        if (!append) setItems([]);
        setError(e instanceof Error ? e.message : "Failed to load listings");
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.city) n++;
    if (filters.minPrice || filters.maxPrice) n++;
    if (filters.bhk.length) n++;
    if (filters.types.length) n++;
    if (filters.sort) n++;
    if (filters.onlyVerified) n++;
    if (filters.zeroBrokerage) n++;
    return n;
  }, [filters]);

  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters(p => ({ ...p, [k]: v }));
  const toggleIn = (k: "bhk" | "types", v: string) =>
    setFilters(p => ({
      ...p,
      [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v],
    }));

  const hasMore = items.length < total;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Search + filter bar */}
      <View style={{ backgroundColor: colors.background, paddingTop: insets.top + 6 }}>
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>
            {lockedPurpose ? "To-Let Rentals" : "Rental Homes"}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 1 }}>
            Zero-brokerage rentals across India
          </Text>
        </View>
        <View style={[styles.top, { backgroundColor: colors.background }]}>
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search location, builder, keyword…"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.text, fontSize: 15 }}
              returnKeyType="search"
              onSubmitEditing={() => setFilters(p => ({ ...p, search: searchText }))}
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            onPress={() => setSheet(true)}
            style={[styles.filterBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Open filters"
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            {activeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p, i) => String(p._id ?? p.id ?? i)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 14, gap: 10 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 14 }}>
              {[0, 1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)}
            </View>
          ) : error ? (
            <StateView visible kind="error" title="Couldn't load properties" message={error} onRetry={() => load(1, false)} style={{ marginTop: 40, borderRadius: 0 }} />
          ) : (
            <StateView
              visible
              kind="empty"
              title="No properties found"
              message="Try widening your filters or searching a different city."
              actionLabel="Clear filters"
              onAction={() => { setFilters(EMPTY); setSearchText(""); }}
              style={{ marginTop: 30, borderRadius: 0, backgroundColor: colors.background }}
            />
          )
        }
        ListFooterComponent={
          more ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <StateView visible kind="loading" full={false} />
            </View>
          ) : undefined
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && !more && hasMore && !error) void load(page + 1, true, true);
        }}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            style={{ flex: 1, maxWidth: "49%" }}
            onPress={() => nav.navigate("PropertyDetail", { id: String(item._id ?? item.id) } as never)}
          />
        )}
      />

      {/* Filter sheet */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)} statusBarTranslucent>
        <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => { setF("sort", ""); setFilters(EMPTY); }}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Reset</Text>
              </Pressable>
            </View>

            <Text style={[styles.gLabel, { color: colors.text }]}>City</Text>
            <TextInput
              value={filters.city}
              onChangeText={t => setF("city", t)}
              placeholder="e.g. Delhi"
              placeholderTextColor={colors.textMuted}
              style={[styles.gInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.chipBg }]}
            />

            <Text style={[styles.gLabel, { color: colors.text }]}>Price range (₹ per month)</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                value={filters.minPrice}
                onChangeText={t => setF("minPrice", t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                style={[styles.gInput, { flex: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.chipBg }]}
              />
              <TextInput
                value={filters.maxPrice}
                onChangeText={t => setF("maxPrice", t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                style={[styles.gInput, { flex: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.chipBg }]}
              />
            </View>

            <Text style={[styles.gLabel, { color: colors.text }]}>Bedrooms (BHK)</Text>
            <View style={styles.wrapRow}>
              {BHK.map(b => (
                <Chip key={b} label={`${b} BHK`} selected={filters.bhk.includes(b)} onPress={() => toggleIn("bhk", b)} />
              ))}
            </View>

            <Text style={[styles.gLabel, { color: colors.text }]}>Property type</Text>
            <View style={styles.wrapRow}>
              {TYPES.map(t => (
                <Chip key={t} label={t} selected={filters.types.includes(t)} onPress={() => toggleIn("types", t)} />
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.gLabel, { color: colors.text, marginBottom: 0 }]}>Verified only</Text>
              <SwitchRow value={filters.onlyVerified} onChange={() => setF("onlyVerified", !filters.onlyVerified)} colors={colors.border} active={colors.primary} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={[styles.gLabel, { color: colors.text, marginBottom: 0 }]}>Zero brokerage</Text>
              <SwitchRow value={filters.zeroBrokerage} onChange={() => setF("zeroBrokerage", !filters.zeroBrokerage)} colors={colors.border} active={colors.primary} />
            </View>

            <Text style={[styles.gLabel, { color: colors.text }]}>Sort</Text>
            <View style={styles.wrapRow}>
              {SORTS.map(so => (
                <Chip key={so.label} label={so.label} selected={filters.sort === so.id} onPress={() => setF("sort", so.id)} />
              ))}
            </View>

            <Button
              label={`Show properties${total ? ` (${total})` : ""}`}
              onPress={() => {
                setSheet(false);
                load(1, false);
              }}
              style={{ marginTop: 18, height: 50 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SwitchRow({ value, onChange, colors, active }: { value: boolean; onChange: () => void; colors: string; active: string }) {
  return (
    <Pressable onPress={onChange} accessibilityRole="switch" accessibilityState={{ checked: value }} style={[styles.sw, { backgroundColor: value ? active : colors }]}>
      <View style={[styles.knob, value && { transform: [{ translateX: 18 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 8, alignItems: "center" },
  search: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, gap: 8, minHeight: 46 },
  filterBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "transparent" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, maxHeight: "85%" },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 10 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  gLabel: { fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 7 },
  gInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  sw: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
});
