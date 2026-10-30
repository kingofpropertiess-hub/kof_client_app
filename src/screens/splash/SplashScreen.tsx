import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * King of Properties — Luxury Splash ("The Royal Invitation")
 *
 * Premium real-estate splash screen built with core primitives only.
 * - Deep charcoal background with champagne-gold ambient glows
 * - The REAL logo (assets/logo.jpg) centred prominently — no white card, no blank square
 * - Tagline beneath the logo: "Curating the Finest Stays & Homes"
 * - Smooth entrance animation sequence (bg → logo → tagline → loader)
 * - Gentle float + breathing glow for premium feel
 * - Minimal loading indicator that matches the brand
 *
 * Pass `exiting` to trigger the outro fade before unmount.
 */

// ---------- Brand palette ----------
const CHARCOAL = "#0E0E0E";      // deep luxury background
const CHARCOAL_SOFT = "#161616"; // slightly lighter for depth
const GOLD = "#C6A25C";          // champagne gold
const GOLD_LIGHT = "#E8D8B8";    // pale gold for text accents
const IVORY = "#FAF8F3";         // warm off-white
const INK = "#1A1A1A";

export function SplashScreen({ exiting = false }: { exiting?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ---------- Animation values ----------
  const rootIn = useRef(new Animated.Value(0)).current;
  const logoIn = useRef(new Animated.Value(0)).current;
  const taglineIn = useRef(new Animated.Value(0)).current;
  const loaderIn = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  // Logo scales down on smaller screens, capped for tablets
  const logoSize = Math.min(width * 0.72, 340);

  // ---------- Entrance sequence ----------
  useEffect(() => {
    /* 1. Canvas fades in */
    Animated.timing(rootIn, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    /* 2. Logo fades in with a premium scale-up */
    Animated.timing(logoIn, {
      toValue: 1,
      duration: 1100,
      delay: 400,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();

    /* 3. Tagline appears beneath the logo */
    Animated.timing(taglineIn, {
      toValue: 1,
      duration: 800,
      delay: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    /* 4. Loading indicator fades in last */
    Animated.timing(loaderIn, {
      toValue: 1,
      duration: 600,
      delay: 1900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    /* 5. Gentle breathing glow behind the logo */
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    /* 6. Subtle float for the logo group */
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {};
  }, [rootIn, logoIn, taglineIn, loaderIn, float, pulse]);

  /* ---------- Outro fade (triggered by RootNavigator) ---------- */
  useEffect(() => {
    if (exiting) {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [exiting, exitFade]);

  /* ---------- Derived animated values ---------- */
  const logoOpacity = logoIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const logoScale = logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const logoY = float.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] });

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  const taglineOpacity = taglineIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const loaderOpacity = loaderIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: CHARCOAL }]} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(rootIn, exitFade) }]}
      >
        {/* ---------- Ambient luxury glows (charcoal + gold) ---------- */}
        <View style={{ position: "absolute", top: -120, right: -100 }}>
          <View style={[styles.ambientGlow, { width: 340, height: 340, backgroundColor: "rgba(198,162,92,0.10)" }]} />
        </View>
        <View style={{ position: "absolute", bottom: -140, left: -110 }}>
          <View style={[styles.ambientGlow, { width: 300, height: 300, backgroundColor: "rgba(198,162,92,0.07)" }]} />
        </View>

        {/* ---------- Center composition ---------- */}
        <View style={styles.center}>
          {/* Breathing halo behind the logo */}
          <Animated.View
            style={{
              position: "absolute",
              width: logoSize * 1.55,
              height: logoSize * 1.55,
              borderRadius: logoSize * 0.775,
              backgroundColor: "rgba(198,162,92,0.14)",
              opacity: Animated.multiply(logoIn, glowOpacity),
              transform: [{ scale: glowScale }],
            }}
          />

          {/* Thin gold ring around the logo (Animated.View: carries animated opacity + scale) */}
          <Animated.View
            style={[
              styles.goldRing,
              {
                width: logoSize * 1.22,
                height: logoSize * 1.22,
                opacity: logoIn,
                transform: [{ scale: logoScale }],
              },
            ]}
          />

          {/* The REAL logo — loaded from assets/logo.jpg */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoY }],
            }}
          >
            <Image
              source={require("../../../assets/logo.jpg")}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
              accessibilityLabel="King of Properties logo"
            />
          </Animated.View>
        </View>

        {/* ---------- Tagline beneath logo ---------- */}
        <Animated.View
          style={[
            styles.taglineWrapper,
            { opacity: taglineOpacity, marginTop: 30 },
          ]}
        >
          <Text style={styles.tagline}>Curating the Finest Stays &amp; Homes</Text>
        </Animated.View>

        {/* ---------- Minimal loading indicator (bottom) ---------- */}
        <Animated.View
          style={[
            styles.loaderContainer,
            {
              opacity: loaderOpacity,
              paddingBottom: Math.max(insets.bottom, 44),
            },
          ]}
        >
          <View style={styles.loaderTrack}>
            <Animated.View
              style={[
                styles.loaderFill,
                {
                  transform: [
                    {
                      translateX: float.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-140, 180],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.loaderLabel}>Initializing</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ambientGlow: {
    position: "absolute",
    borderRadius: 9999,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  goldRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(198,162,92,0.35)",
    borderRadius: 9999,
  },
  taglineWrapper: {
    alignItems: "center",
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: GOLD_LIGHT,
    fontWeight: "500",
    fontFamily: "System",
    textAlign: "center",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loaderTrack: {
    width: 170,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(198,162,92,0.14)",
    overflow: "hidden",
    marginBottom: 14,
  },
  loaderFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  loaderLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(198,162,92,0.55)",
    fontWeight: "500",
  },
});
