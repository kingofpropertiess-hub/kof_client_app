import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Footer tab bar that mirrors the web app's MobileBottomNav:
 * Home · Style · To-Let (raised action) · Bookings · AI · Profile
 *
 * `Explore` and `Stays` still live in the tab navigator so the
 * existing in-app links keep working, but they are intentionally not rendered
 * here — the footer only shows the primary destinations.
 */

type IconName = string;

interface Item {
  route: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}

const ITEMS: Item[] = [
  { route: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { route: "Style", label: "Style", icon: "sparkles-outline", activeIcon: "sparkles" },
  { route: "Bookings", label: "Bookings", icon: "calendar-outline", activeIcon: "calendar" },
  { route: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

/** Routes that are shown inside the "Home" flow even though they are not the Home tab. */
const HOME_FLOW = ["Home", "Explore", "Stays"];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const currentRoute = state.routes[state.index]?.name ?? "Home";
  const isActive = (route: string) =>
    route === "Home" ? HOME_FLOW.includes(currentRoute) : currentRoute === route;

  const navigateTo = (route: string) => {
    const target = state.routes.find(r => r.name === route);
    if (!target) return;
    const event = navigation.emit({
      type: "tabPress",
      target: target.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(route);
  };

  const openAiChat = () => {
    // AI lives in the parent stack (slide-up screen), just like the web app's
    // chatbot overlay — so the footer item behaves as an action, not a tab.
    (navigation.getParent() as any)?.navigate("AiChat");
  };

  const renderItem = (item: Item) => {
    const active = isActive(item.route);
    const tint = active ? colors.primary : colors.textMuted;
    return (
      <Pressable
        key={item.route}
        onPress={() => navigateTo(item.route)}
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        hitSlop={6}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={active ? item.activeIcon : item.icon} size={21} color={tint} />
        </View>
        <Text style={[styles.label, { color: tint }, active && styles.labelActive]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View style={styles.row}>
        {renderItem(ITEMS[0])}
        {renderItem(ITEMS[1])}

        {/* To-Let — raised red circle in the centre, like the web footer */}
        <Pressable
          onPress={() => navigateTo("ToLet")}
          style={styles.item}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive("ToLet") }}
          accessibilityLabel="To-Let"
          hitSlop={6}
        >
          <View
            style={[
              styles.fab,
              {
                backgroundColor: colors.primary,
                borderColor: colors.tabBar,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.onPrimary} />
          </View>
          <Text style={[styles.label, styles.labelActive, { color: colors.primary }]}>To-Let</Text>
        </Pressable>

        {/* My Bookings — every reservation across categories */}
        {renderItem(ITEMS[2])}

        {/* AI — opens the assistant screen */}
        <Pressable
          onPress={openAiChat}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel="AI Assistant"
          hitSlop={6}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.label, { color: colors.text }]}>AI</Text>
        </Pressable>

        {renderItem(ITEMS[3])}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  row: {
    flexDirection: "row",
    height: 50,
    paddingHorizontal: 4,
    overflow: "visible",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  iconWrap: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  label: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: "800",
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    marginBottom: 4,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
});
