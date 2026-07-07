import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable,
  StyleSheet, SafeAreaView, Keyboard, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { chat as sendChat } from '../../src/api/aura';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule ?? null;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent ?? (() => {});
} catch {} // not available in Expo Go
import { useSettings } from '../../src/stores/settingsStore';
import { useWs } from '../../src/stores/wsStore';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassButton from '../../src/components/GlassButton';
import GlassInput from '../../src/components/GlassInput';
import Orb from '../../src/components/Orb';

type Message = {
  id: string;
  role: 'user' | 'aura';
  content: string;
  timestamp: number;
};

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const router = useRouter();
  const isLoaded = useSettings((s) => s.isLoaded);
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results?.[0]?.transcript) {
      setInput((prev) => (prev ? prev + ' ' + event.results[0].transcript : event.results[0].transcript));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    if (event.error !== 'no-speech') {
      Alert.alert('Voice Error', event.message);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  const isOrbActive = loading || wsState === 'thinking' || wsState === 'speaking' || wsState === 'listening';

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const auraMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'aura',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, auraMsg]);
    setInput('');
    setLoading(true);
    setStreamingId(auraMsg.id);

    try {
      const history = messages
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => ({
          role: m.role === 'aura' ? 'assistant' : 'user',
          content: m.content,
        }));

      await sendChat(text, history, 'deep', (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === auraMsg.id ? { ...m, content: m.content + chunk } : m
          )
        );
      });
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === auraMsg.id
            ? { ...m, content: `Error: ${e.message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  }, [input, loading, messages]);

  const startRecording = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert('Not Available', 'Speech recognition requires a development build. Press s in Metro, then run npx expo run:android to build the app with native modules.');
      return;
    }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Microphone permission is required');
        return;
      }
      setIsRecording(true);
      ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert('Error', `Could not start voice: ${e.message}`);
    }
  };

  const stopRecording = () => {
    if (!ExpoSpeechRecognitionModule) return;
    setIsRecording(false);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const isStreaming = item.id === streamingId;
    return (
      <Animated.View
        entering={FadeInDown.duration(200)}
        style={[styles.bubble, isUser ? styles.userBubble : styles.auraBubble]}
      >
        {!isUser && (
          <View style={styles.auraLabelRow}>
            <View style={styles.auraDot} />
            <Text style={styles.auraLabel}>Aura</Text>
          </View>
        )}
        <Text style={isUser ? styles.userText : styles.auraText}>
          {item.content || (isStreaming ? '...' : '')}
        </Text>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>{formatTime(item.timestamp)}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoWrap}>
            <MaterialIcons name="psychology" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AURA</Text>
            <Text style={styles.headerSub}>{wsConnected ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/settings')} style={styles.settingsBtn}>
          <MaterialIcons name="settings" size={20} color={colors.onSurfaceMuted} />
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Orb active={isOrbActive} size={80} />
              <Text style={styles.emptyTitle}>AURA</Text>
              <Text style={styles.emptySubtext}>
                {!wsConnected
                  ? 'Disconnected from backend'
                  : isLoaded
                    ? 'Tap the mic or type a message'
                    : 'Loading...'}
              </Text>
              <View style={[styles.wsPill, { backgroundColor: wsConnected ? 'rgba(63,185,80,0.08)' : 'rgba(255,69,58,0.08)' }]}>
                <View style={[styles.wsDot, { backgroundColor: wsConnected ? colors.tertiary : colors.error }]} />
                <Text style={[styles.wsLabel, { color: wsConnected ? colors.tertiary : colors.error }]}>
                  {isRecording ? 'Recording...'
                    : wsState === 'speaking' ? 'Speaking...'
                      : wsState === 'thinking' ? 'Thinking...'
                        : wsState === 'listening' ? 'Listening...'
                          : wsConnected ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          }
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(kbHeight, 12) }]}>
          <GlassInput
            style={styles.input}
            placeholder="Message Aura..."
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && { opacity: 0.85 },
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <MaterialIcons name="arrow-upward" size={20} color="#050505" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.micBtn,
              isRecording && styles.micBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={18} color={isRecording ? '#fff' : colors.onSurfaceSecondary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(0,242,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 16, letterSpacing: 1 },
  headerSub: { color: colors.onSurface, fontSize: 10, fontWeight: '500' },
  settingsBtn: { padding: 6, borderRadius: 8 },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.card },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  auraBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.glassBg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  auraLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  auraDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  auraLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  userText: { ...typography.bodyMd, color: '#050505' },
  auraText: { ...typography.bodyMd, color: colors.onSurface },
  timestamp: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  userTimestamp: { color: 'rgba(0,0,0,0.4)' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { ...typography.headlineMd, color: colors.onSurface, letterSpacing: 2, marginTop: spacing.sm },
  emptySubtext: { color: colors.onSurface, fontSize: 13 },
  wsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: spacing.sm,
  },
  wsDot: { width: 6, height: 6, borderRadius: 3 },
  wsLabel: { fontSize: 11, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.glassBorder,
    backgroundColor: colors.bgDeep, alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.glassBg,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sendBtn: {
    borderRadius: radius.button, justifyContent: 'center', alignItems: 'center',
    width: 40, height: 40, backgroundColor: colors.primary,
  },
  sendBtnDisabled: { opacity: 0.3 },
  micBtn: {
    borderRadius: radius.button, justifyContent: 'center', alignItems: 'center',
    width: 40, height: 40, backgroundColor: colors.glassBg,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  micBtnActive: { backgroundColor: colors.error, borderColor: colors.error },
});
