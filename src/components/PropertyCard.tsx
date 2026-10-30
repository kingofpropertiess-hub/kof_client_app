import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../theme/ThemeProvider";
import { SmartImage } from "./ui/SmartImage";
import { useWishlist } from "../context/WishlistProvider";
import { useAuthGate } from "../auth/useAuthGate";
import { compactPrice, normalizeId } from "../utils/format";
import type { Property } from "../lib/types";

interface Props {
  property: Property;
  horizontal?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function PropertyCard({ property, horizontal, style, onPress }: Props) {
  const { colors } = useTheme();
  const { has, toggle } = useWishlist();
  const requireAuth = useAuthGate();
  const saved = has(property._id || property.id);
  const img = property.images?.length ? property.images[0] : property.image;

  const facts = [
    property.bhk ? `${property.bhk} BHK` : property.type,
    property.area || (property.areaSize ? `${property.areaSize} sq.ft` : ""),
    property.furnishing || "",
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={property.title}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        horizontal ? { width: 246, marginRight: 10 } : {},
        style,
      ]}
    >
      <View>
        <SmartImage uri={img} label={property.type || "Property"} style={styles.img} />
        <View style={styles.top}>
          {property.isVerified ? (
            <View style={[styles.pill, { backgroundColor: "rgba(14,159,110,0.92)" }]}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" />
              <Text style={styles.pillText}>Verified</Text>
            </View>
          ) : null}
          {property.isFeatured ? (
            <View style={[styles.pill, { backgroundColor: "rgba(225,29,72,0.92)" }]}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.pillText}>Featured</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={e => {
            e?.stopPropagation?.();
            if (!requireAuth("Sign in to save this property to your wishlist.")) return;
            void toggle(property._id || property.id);
          }}
          onPressIn={e => e.stopPropagation()}
          style={[styles.heart, { backgroundColor: colors.surface }]}
          accessibilityLabel={saved ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={17}
            color={saved ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={[styles.price, { color: colors.primary }]}>
          {
            property.purpose?.includes("rent") || property.listingType === "TO_LET"
              ? property.monthlyRent
                ? `₹${property.monthlyRent.toLocaleString("en-IN")}/mo`
                : compactPrice(property.price, property.priceLabel, "/mo")
              : compactPrice(property.price, property.priceLabel)
          }
        </Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {property.title}
        </Text>
        <View style={styles.locRow}>
          <Ionicons name="location-sharp" size={13} color={colors.textMuted} />
          <Text style={[styles.loc, { color: colors.textMuted }]} numberOfLines={1}>
            {property.locality ? `${property.locality}, ` : ""}
            {property.city || property.location}
          </Text>
        </View>
        <View style={styles.facts}>
          {facts.map((f, i) => (
            <View key={i} style={[styles.fact, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.factText, { color: colors.text }]} numberOfLines={1}>
                {f}
              </Text>
            </View>
          ))}
        </View>
        {property.isZeroBrokerage || property.brokerage === "No Brokerage" ? (
          <Text style={[styles.brokerage, { color: colors.success }]}>No Brokerage</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// note: keep id normalization import used
void normalizeId;

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  img: { height: 120, width: "100%" },
  top: { position: "absolute", top: 7, left: 7, flexDirection: "row", gap: 5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  heart: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  body: { padding: 10, paddingTop: 8, gap: 3 },
  price: { fontSize: 15, fontWeight: "800" },
  title: { fontSize: 13.5, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  loc: { fontSize: 11.5, flexShrink: 1 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 1 },
  fact: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  factText: { fontSize: 11, fontWeight: "600" },
  brokerage: { fontSize: 11, fontWeight: "700", marginTop: 1 },
});
