import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useTheme } from "../../theme/ThemeProvider";
import { AiApi } from "../../lib/api";
import type { Property } from "../../lib/types";
import { SmartImage } from "../../components/ui/SmartImage";

import { useNavigation, useRoute } from "@react-navigation/native";
interface Msg {
  id: string;
  from: "ai" | "user";
  text: string;
}

const WELCOME: Msg = {
  id: "w",
  from: "ai",
  text: "Hi! 👋 I'm your King of Properties AI assistant. Ask me things like “2 BHK flat in Delhi under ₹50L”, or about EMI, investment yields, or listing your property.",
};

export function AiChatScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const seedMsg: string | undefined = route.params?.seedMessage;

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [suggested, setSuggested] = useState<string[]>(["Search 3 BHK flats in Delhi", "Commercial investment options", "How to calculate EMI?"]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<any>(null);
  const seededRef = useRef(false);
  // Used by the Retry affordance when a request fails.
  const lastUserText = messages.reduce((acc, m) => (m.from === "user" ? m.text : acc), "");

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || thinking) return;
    setError(null);
    const userMsg: Msg = { id: `u${Date.now()}`, from: "user", text: msg };
    const nextHistory = [...messages, userMsg].map(m => ({ sender: m.from === "user" ? ("user" as const) : ("ai" as const), text: m.text }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    setThinking(true);
    try {
      const res = await AiApi.chat(msg, nextHistory.filter(h => h.text !== WELCOME.text));
      const reply = res?.reply || "Sorry, I couldn't answer that. Try asking about properties in Delhi, Mumbai, or about EMI!";
      const propList = (Array.isArray(res?.properties) ? res.properties : [])
        // Sale listings are out of scope for the app — surface rentals only.
        .filter((p: Property) =>
          (p.listingType || "").toUpperCase().includes("TO_LET") ||
          /(to-?let|rent)/i.test((p.purpose || "").replace(/[\s_]/g, "-") || ""));
      setProperties(propList.slice(0, 4));
      if (res?.suggestedPrompts?.length) setSuggested(res.suggestedPrompts.slice(0, 3));
      setMessages(prev => [...prev, { id: `a${Date.now()}`, from: "ai", text: reply }]);
    } catch (e: unknown) {
      setMessages(prev => [...prev, { id: `e${Date.now()}`, from: "ai", text: "I couldn't reach the server. Please check your connection and try again." }]);
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Seed from a quick-search typed on Home.
  useEffect(() => {
    if (seedMsg && !seededRef.current) {
      seededRef.current = true;
      void send(seedMsg);
    }
    // Fire once per incoming seed; `send` closes over the latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedMsg]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, thinking, properties.length]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surfaceAlt }]} edges={["bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} accessibilityLabel="Close chat" hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={[styles.aiDot, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={15} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>AI Assistant</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11.5 }}>Rental homes · Hourly stays · EMI help</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
          {messages.map(m => (
            <View key={m.id} style={[styles.bubble, { backgroundColor: m.from === "user" ? colors.primary : colors.surface, alignSelf: m.from === "user" ? "flex-end" : "flex-start", borderBottomRightRadius: m.from === "user" ? 4 : 16, borderBottomLeftRadius: m.from === "ai" ? 4 : 16 }]}>
              <Text style={{ color: m.from === "user" ? "#fff" : colors.text, fontSize: 14.5, lineHeight: 20 }}>{m.text}</Text>
            </View>
          ))}

          {thinking ? (
            <View style={[styles.bubble, { backgroundColor: colors.surface, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Thinking…</Text>
            </View>
          ) : null}

          {properties.length > 0 ? (
            <View style={{ marginTop: 2 }}>
              {properties.map(p => (
                <Pressable
                  key={String(p._id ?? p.id)}
                  onPress={() => nav.navigate("PropertyDetail" as never, { id: String(p._id ?? p.id) } as never)}
                  style={[styles.propRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SmartImage uri={p.images?.[0] || p.image} style={styles.propImg} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13.5 }} numberOfLines={1}>{p.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{[p.locality, p.city].filter(Boolean).join(", ")}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* suggested prompts */}
        {error && !thinking ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 12.5, flex: 1 }} numberOfLines={2}>{error}</Text>
            <Pressable onPress={() => void send(lastUserText)} hitSlop={8} accessibilityLabel="Retry">
              <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: "800" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* suggested prompts */}
        {messages.length <= 2 && !thinking ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 8, gap: 6 }}>
            {suggested.map(sp => (
              <Pressable key={sp} onPress={() => void send(sp)} style={[styles.suggest, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>{sp}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* composer */}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about property search, EMI, ROI…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: 15, maxHeight: 110 }}
            multiline
            onSubmitEditing={() => void send(input)}
          />
          <Pressable
            onPress={() => void send(input)}
            disabled={thinking || !input.trim()}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !thinking ? colors.primary : colors.chipBg }]}
            accessibilityLabel="Send message"
          >
            <Ionicons name="arrow-up" size={19} color={input.trim() && !thinking ? "#fff" : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "transparent" },
  aiDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  propRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 9 },
  propImg: { width: 52, height: 44, borderRadius: 9 },
  suggest: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "flex-start" },
  composer: { borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", padding: 10, gap: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
