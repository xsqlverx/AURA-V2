import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { chat as sendChat, uploadAudio } from '../../src/api/aura';
import { useSettings } from '../../src/stores/settingsStore';
import { useWs } from '../../src/stores/wsStore';
import { colors } from '../../src/theme';
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
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const isLoaded = useSettings((s) => s.isLoaded);
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);

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

  // ── Voice Recording ────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      await requestRecordingPermissionsAsync();
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      const r = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await r.prepareToRecordAsync();
      r.record();
      setRecorder(r);
      setIsRecording(true);
    } catch (e: any) {
      Alert.alert('Error', `Could not start recording: ${e.message}`);
    }
  };

  const stopRecording = async () => {
    if (!recorder) return;
    setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecorder(null);
      if (!uri) return;

      const text = await uploadAudio(uri);
      if (text) {
        setInput((prev) => (prev ? prev + ' ' + text : text));
      } else {
        Alert.alert('No speech detected', 'Could not transcribe audio');
      }
    } catch (e: any) {
      setRecorder(null);
      Alert.alert('Error', `Transcription failed: ${e.message}`);
    }
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
        {!isUser && <Text style={styles.auraLabel}>Aura</Text>}
        <Text style={isUser ? styles.userText : styles.auraText}>
          {item.content || (isStreaming ? '...' : '')}
        </Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.wsDot, wsConnected ? styles.wsOn : styles.wsOff]} />
          <Text style={styles.headerTitle}>Aura</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Text style={{ color: colors.accentCyan, fontSize: 20 }}>⚙</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Orb active={isOrbActive} size={100} />
              <Text style={styles.emptyTitle}>Aura</Text>
              <Text style={styles.emptySubtext}>
                {!wsConnected
                  ? 'Disconnected'
                  : isLoaded
                    ? 'Tap the mic or type a message'
                    : 'Loading...'}
              </Text>
              <Text style={styles.wsLabel}>
                {isRecording ? 'Recording...'
                  : wsState === 'speaking' ? 'Speaking...'
                    : wsState === 'thinking' ? 'Thinking...'
                      : wsState === 'listening' ? 'Listening...'
                        : wsConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message Aura..."
            placeholderTextColor="#484F58"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && { opacity: 0.7 },
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.micBtn,
              isRecording && styles.micBtnActive,
              pressed && { opacity: 0.7 },
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: colors.accentCyan, fontSize: 20, fontWeight: '700' },
  wsDot: { width: 8, height: 8, borderRadius: 4 },
  wsOn: { backgroundColor: colors.accentGreen },
  wsOff: { backgroundColor: colors.accentRed },
  settingsBtn: { padding: 4 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1F6FEB',
    borderBottomRightRadius: 4,
  },
  auraBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgSecondary,
    borderBottomLeftRadius: 4,
  },
  auraLabel: { color: colors.accentCyan, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  userText: { color: '#F0F6FC', fontSize: 15 },
  auraText: { color: '#F0F6FC', fontSize: 15, lineHeight: 22 },
  timestamp: { color: colors.textMuted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: colors.textSecondary, fontSize: 24, fontWeight: '700', marginTop: 8 },
  emptySubtext: { color: colors.textMuted, fontSize: 14 },
  wsLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgPrimary,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    backgroundColor: colors.accentCyan,
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
  micBtn: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    backgroundColor: colors.bgTertiary,
  },
  micBtnActive: {
    backgroundColor: colors.accentRed,
  },
  micIcon: { fontSize: 18 },
});
