import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../theme/ThemeProvider";
import { SmartImage } from "./ui/SmartImage";
import { compactPrice } from "../utils/format";
import type { Stay } from "../lib/types";

interface Props {
  stay: Stay;
  horizontal?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

/** Card for hourly hotels / villas (stays), mirroring PropertyCard's design. */
export function StayCard({ stay, horizontal, style, onPress }: Props) {
  const { colors } = useTheme();
  const img = stay.images?.length ? stay.images[0] : undefined;
  const title = stay.name || (stay as unknown as { title?: string }).title || "Stay";
  const type = stay.type || stay.category || "Stay";
  const price = stay.price ?? stay.pricePerHour ?? stay.startingRate;
  const priceLabel = stay.priceLabel || (price ? compactPrice(price, undefined, " / hr") : "Price on request");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title} details`}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        horizontal ? { width: 232, marginRight: 10 } : {},
        style,
      ]}
    >
      <View>
        <SmartImage uri={img} label={type} style={styles.img} />
        <View style={styles.top}>
          {stay.isVerified ? (
            <View style={[styles.pill, { backgroundColor: "rgba(14,159,110,0.92)" }]}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" />
              <Text style={styles.pillText}>Verified</Text>
            </View>
          ) : null}
          <View style={[styles.pill, { backgroundColor: "rgba(225,29,72,0.92)" }]}>
            <Ionicons name="time" size={10} color="#fff" />
            <Text style={styles.pillText}>Hourly</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.price, { color: colors.primary }]} numberOfLines={1}>
          {priceLabel}
        </Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.locRow}>
          <Ionicons name="location-sharp" size={13} color={colors.textMuted} />
          <Text style={[styles.loc, { color: colors.textMuted }]} numberOfLines={1}>
            {[stay.location, stay.city].filter(Boolean).join(", ")}
          </Text>
        </View>
        {stay.rating ? (
          <View style={[styles.rating, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.text }]}>{stay.rating}</Text>
            <Text style={[styles.typeText, { color: colors.textMuted }]} numberOfLines={1}>
              {type}
            </Text>
          </View>
        ) : (
          <Text style={[styles.typeText, { color: colors.textMuted }]} numberOfLines={1}>
            {type}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  img: { height: 112, width: "100%" },
  top: { position: "absolute", top: 7, left: 7, flexDirection: "row", gap: 5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  body: { padding: 10, paddingTop: 8, gap: 3 },
  price: { fontSize: 15, fontWeight: "800" },
  title: { fontSize: 13.5, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  loc: { fontSize: 11.5, flexShrink: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, alignSelf: "flex-start", marginTop: 1 },
  ratingText: { fontSize: 11, fontWeight: "800" },
  typeText: { fontSize: 11, fontWeight: "600", marginTop: 1, flex: 1 },
});
