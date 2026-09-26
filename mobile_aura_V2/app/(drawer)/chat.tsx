import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Orb } from '../../src/components/orb/Orb';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { InputBar } from '../../src/components/chat/InputBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { Toast } from '../../src/components/shared/Toast';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { tryFastPath } from '../../src/router/fastpathRouter';
import { initNeedle, tryNeedleRoute } from '../../src/router/needleRouter';
import { executeMobileCapability } from '../../src/capabilities/mobileExecutor';
import { checkPcConnection, sendToPc } from '../../src/api/client';
import { streamFromOpenRouter, planMultiStepAction } from '../../src/api/openrouter';
import { speak, stopSpeaking } from '../../src/services/tts';
import { devLog } from '../../src/utils/devLog';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import type { Message } from '../../src/types';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' as 'error' | 'info' | 'success' });
  const [streamingText, setStreamingText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const {
    orbState,
    messages,
    pcConnected,
    isProcessing,
    setOrbState,
    addMessage,
    setPcConnected,
    setIsProcessing,
  } = useAppStore();

  const { toolProvider, chatProvider } = useSettingsStore();

  useEffect(() => {
    initNeedle().then((ok) => {
      devLog.info(`Needle SLM router status: ${ok ? 'ready' : 'using keyword fallback'}`);
    });
    checkPcConnection().then((ok) => setPcConnected(ok));
  }, []);

  const showToast = (message: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    setInputText('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    setIsProcessing(true);
    setStreamingText('');

    try {
      // 1. TIER 1: DETERMINISTIC FAST-PATH (<5ms, ZERO LLM COST)
      const fastResult = await tryFastPath(text, pcConnected);
      if (fastResult.handled) {
        setOrbState('success');
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fastResult.message,
          timestamp: Date.now(),
          routedTo: fastResult.target as any,
        };
        addMessage(reply);
        speak(fastResult.message).finally(() => {
          setTimeout(() => setOrbState('idle'), 1200);
          setIsProcessing(false);
        });
        return;
      }

      // 2. TIER 2: COMPOUND ACTION PLANNER (Multi-step directives via Tool Provider)
      if (fastResult.isCompound) {
        setOrbState('executing');
        const plan = await planMultiStepAction(text);
        if (plan && plan.steps && plan.steps.length > 0) {
          const planSummary = `Action Plan Synthesized (${plan.steps.length} steps):\n${plan.steps
            .map((s: any, idx: number) => `${idx + 1}. ${s.action} ${s.package || s.contact || s.url || ''}`)
            .join('\n')}`;

          const reply: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: planSummary,
            timestamp: Date.now(),
            routedTo: 'MOBILE',
          };
          addMessage(reply);
          setOrbState('speaking');
          speak(`Executing ${plan.steps.length} step sequence.`).finally(() => {
            setOrbState('idle');
            setIsProcessing(false);
          });
          return;
        }
      }

      // 3. TIER 3: NEEDLE SLM ON-DEVICE ROUTER
      const needleRoute = await tryNeedleRoute(text);
      if (needleRoute && needleRoute.target === 'MOBILE' && needleRoute.capability) {
        setOrbState('thinking');
        const result = await executeMobileCapability(needleRoute.capability as any, {});
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
          routedTo: 'MOBILE',
        };
        addMessage(reply);
        setOrbState('speaking');
        speak(result.message).finally(() => {
          setOrbState('idle');
          setIsProcessing(false);
        });
        return;
      }

      // 4. TIER 4: CONVERSATIONAL STREAMING VIA CHAT PROVIDER
      setOrbState('thinking');
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abort = streamFromOpenRouter(
        text,
        history,
        {
          onToken: (accumulated) => {
            setStreamingText(accumulated);
          },
          onDone: (fullText) => {
            setStreamingText('');
            const reply: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: fullText || 'Directive received.',
              timestamp: Date.now(),
              routedTo: 'CHAT',
            };
            addMessage(reply);
            setOrbState('speaking');
            speak(fullText).finally(() => {
              setOrbState('idle');
              setIsProcessing(false);
            });
          },
          onError: (err) => {
            setStreamingText('');
            showToast(err.message || 'Stream connection error.');
            setOrbState('error');
            setTimeout(() => setOrbState('idle'), 2000);
            setIsProcessing(false);
          },
        }
      );
      abortRef.current = abort;
    } catch (e: any) {
      setOrbState('idle');
      setIsProcessing(false);
      showToast(e?.message || 'Processing fault.');
    }
  }, [inputText, isProcessing, pcConnected, messages]);

  const handleStop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    stopSpeaking();
    if (streamingText) {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: streamingText,
        timestamp: Date.now(),
        routedTo: 'CHAT',
      };
      addMessage(reply);
      setStreamingText('');
    }
    setOrbState('idle');
    setIsProcessing(false);
  }, [streamingText]);

  const toggleVoiceMode = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (orbState === 'listening') {
        setOrbState('idle');
        stopSpeaking();
      } else {
        setOrbState('listening');
        showToast('AURA Listening... Say your directive', 'info');
      }
    } catch {
      // Safe fallback
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="AURA" subtitle="NEURAL STREAM // ACTIVE" />

      {/* Compact Interactive Swarm Orb */}
      <View style={styles.orbStrip}>
        <Orb state={orbState} size={50} onPress={toggleVoiceMode} showCradle={false} />
        <View style={styles.stateTag}>
          <Text style={styles.stateTagText}>{orbState.toUpperCase()}</Text>
          <Text style={styles.stateTagSub}>TAP TO TOGGLE VOICE STREAM</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<EmptyChatState />}
          ListFooterComponent={
            streamingText ? (
              <View style={styles.streamingContainer}>
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingText,
                    timestamp: Date.now(),
                    routedTo: 'CHAT',
                  }}
                />
              </View>
            ) : null
          }
        />

        {isProcessing && streamingText ? (
          <View style={styles.stopBar}>
            <Text style={styles.thinkingText}>Streaming response</Text>
            <Pressable style={styles.stopBtn} onPress={handleStop}>
              <Text style={styles.stopBtnText}>STOP</Text>
            </Pressable>
          </View>
        ) : null}

        <InputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          isProcessing={isProcessing}
          orbState={orbState}
          onMicPress={toggleVoiceMode}
        />

        <View style={{ height: 75 }} />
      </KeyboardAvoidingView>

      <BottomTabBar />

      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '', type: 'error' })}
        type={toast.type}
      />
    </SafeAreaView>
  );
}

function EmptyChatState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="sparkles-outline" size={26} color={Colors.cyan.primary} />
      </View>
      <Text style={styles.emptyTitle}>AURA Neural Copilot</Text>
      <Text style={styles.emptySubtitle}>
        Direct actions with FastPath or chat with dual-model intelligence.
      </Text>
      <View style={styles.hintsRow}>
        <View style={styles.hintChip}>
          <Text style={styles.hintText}>"Open front camera"</Text>
        </View>
        <View style={styles.hintChip}>
          <Text style={styles.hintText}>"WhatsApp Mom"</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },

  orbStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(17, 16, 24, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 83, 153, 0.15)',
    gap: 12,
  },
  stateTag: {
    gap: 2,
  },
  stateTagText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.cyan.primary,
    letterSpacing: 1,
  },
  stateTagSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8,
    color: Colors.text.dim,
    letterSpacing: 0.5,
  },

  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  streamingContainer: {
    opacity: 0.95,
  },

  stopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
  },
  thinkingText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.red.bright,
  },
  stopBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.red.primary,
  },
  stopBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(106, 83, 153, 0.2)',
    borderWidth: 1,
    borderColor: Colors.purple.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.text.dim,
    textAlign: 'center',
    lineHeight: 18,
  },
  hintsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  hintChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hintText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.cyan.primary,
  },
});
