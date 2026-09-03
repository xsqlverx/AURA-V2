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
import { router, useNavigation } from 'expo-router';
import { Orb } from '../../src/components/orb/Orb';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { InputBar } from '../../src/components/chat/InputBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { Toast } from '../../src/components/shared/Toast';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { classifyMessage } from '../../src/router/taskRouter';
import { executeMobileCapability } from '../../src/capabilities/mobileExecutor';
import { checkPcConnection, sendToPc } from '../../src/api/client';
import { streamFromOpenRouter } from '../../src/api/openrouter';
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
  const lastPcState = useRef<boolean | null>(null);
  const navigation = useNavigation();

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

  const { openrouterApiKey } = useSettingsStore();

  useEffect(() => {
    const check = async () => {
      const connected = await checkPcConnection();
      if (lastPcState.current !== null && lastPcState.current !== connected) {
        showToast(
          connected ? 'PC connected' : 'PC not reachable',
          connected ? 'success' : 'error'
        );
      }
      lastPcState.current = connected;
      setPcConnected(connected);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
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
      const route = classifyMessage(text);

      if (route.target === 'MOBILE' && route.capability) {
        setOrbState('thinking');
        const result = await executeMobileCapability(
          route.capability as any,
          { number: text.match(/[\d\s+()-]{7,}/)?.[0]?.trim() ?? '' }
        );

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

        if (!result.success) showToast(result.message);
      } else if (route.target === 'PC' && pcConnected) {
        setOrbState('thinking');
        try {
          const result = await sendToPc(route.capability!, { query: text });
          const reply: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: typeof result === 'string' ? result : JSON.stringify(result),
            timestamp: Date.now(),
            routedTo: 'PC',
          };
          addMessage(reply);
        } catch (err) {
          showToast('Could not reach PC. Try again.');
          devLog.error('PC capability failed', err);
        }
      } else {
        if (!openrouterApiKey) {
          showToast('No API key. Go to Settings to configure OpenRouter.');
          const reply: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'I need an OpenRouter API key to respond. Open the drawer and go to Settings.',
            timestamp: Date.now(),
            routedTo: 'CHAT',
          };
          addMessage(reply);
          return;
        }

        setOrbState('thinking');
        const history = messages.slice(-10).map((m) => ({
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
                content: fullText || 'No response received.',
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
              showToast(err.message || 'Failed to get response.');
              devLog.error('OpenRouter stream error', err);
              setOrbState('idle');
            },
          }
        );
        abortRef.current = abort;
      }
    } finally {
      if (!streamingText) {
        setOrbState('idle');
        setIsProcessing(false);
      }
    }
  }, [inputText, isProcessing, pcConnected, messages, openrouterApiKey]);

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

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />

      {/* Header with hamburger + settings */}
      <View style={styles.header}>
        <Pressable
          style={styles.menuBtn}
          onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' })}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle}>AURA</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.orbArea}>
        <Orb state={orbState} onPress={() => setOrbState('listening')} />
        {orbState !== 'idle' && (
          <View style={styles.stateIndicator}>
            <Text style={styles.stateText}>{orbState.toUpperCase()}</Text>
          </View>
        )}
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
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            streamingText ? (
              <View style={styles.streamingContainer}>
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingText,
                    timestamp: Date.now(),
                  }}
                />
              </View>
            ) : null
          }
        />

        {isProcessing && streamingText ? (
          <View style={styles.stopBar}>
            <Text style={styles.thinkingText}>Thinking</Text>
            <Pressable style={styles.stopBtn} onPress={handleStop}>
              <View style={styles.stopIcon} />
            </Pressable>
          </View>
        ) : null}

        <InputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          isProcessing={isProcessing}
          orbState={orbState}
        />
      </KeyboardAvoidingView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '', type: 'error' })}
        type={toast.type}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>Ask AURA anything.</Text>
      <Text style={styles.emptySubtext}>Talk, tap, or glance.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    height: 56,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  menuBtn: {
    padding: Theme.spacing.sm,
  },
  menuIcon: {
    fontSize: 20,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    color: Colors.cyan.primary,
  },
  settingsBtn: {
    padding: Theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 18,
    color: Colors.text.secondary,
  },

  orbArea: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  stateIndicator: {
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: 2,
    backgroundColor: Colors.cyan.glow,
    borderRadius: 4,
  },
  stateText: {
    ...Theme.typography.hud,
    fontSize: 9,
    color: Colors.cyan.primary,
  },

  messageList: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },

  streamingContainer: {
    opacity: 0.9,
  },

  stopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  thinkingText: {
    ...Theme.typography.mono,
    fontSize: 11,
    color: Colors.text.dim,
  },
  stopBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.red.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: Colors.background,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Theme.spacing.xs,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Colors.text.secondary,
  },
  emptySubtext: {
    ...Theme.typography.mono,
    color: Colors.text.dim,
  },
});
