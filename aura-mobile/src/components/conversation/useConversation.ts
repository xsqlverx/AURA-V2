import { useState, useCallback, useRef, useEffect } from 'react';
import { Keyboard, Alert, Platform } from 'react-native';
import { chat as sendChatApi } from '../../api/aura';
import { useSettings } from '../../stores/settingsStore';
import { useWs } from '../../stores/wsStore';
import { extractHandoffs, executeHandoff, type HandoffAction } from '../../services/handoff';
import type {
  Message, ConversationPhase, ToolInfo, MemoryInfo, ProgressStage,
  UserMessage, TextMessage, ToolMessage, MemoryMessage, ErrorMessage, ProgressMessage,
} from './types';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule ?? null;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent ?? (() => {});
} catch {}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<ConversationPhase>('idle');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [kbHeight, setKbHeight] = useState(0);
  const isLoaded = useSettings((s) => s.isLoaded);
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);
  const messagesRef = useRef<Message[]>([]);
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const streamBufferRef = useRef('');
  const pendingHandoffsRef = useRef<HandoffAction[]>([]);

  // Keep ref in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Keyboard tracking
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Sync WebSocket state to conversation phase
  useEffect(() => {
    if (!wsConnected) { setPhase('idle'); return; }
    switch (wsState) {
      case 'listening': setPhase('listening'); break;
      case 'thinking': setPhase('processing'); break;
      case 'speaking': setPhase('speaking'); break;
      case 'disconnected': setPhase('idle'); break;
      default: if (phase === 'listening' || phase === 'speaking') setPhase('idle'); break;
    }
  }, [wsState, wsConnected]);

  // Speech recognition events
  useSpeechRecognitionEvent('result', (event: any) => {
    if (event.results?.[0]?.transcript) {
      setInputText((prev) => (prev ? prev + ' ' + event.results[0].transcript : event.results[0].transcript));
    }
  });

  useSpeechRecognitionEvent('error', (event: any) => {
    setIsRecording(false);
    if (event.error !== 'no-speech') {
      Alert.alert('Voice Error', event.message);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    startingRef.current = false;
    startedRef.current = false;
    stopRequestedRef.current = false;
  });

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, updater: (msg: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: UserMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const responseId = `aura-${Date.now() + 1}`;
    const responseMsg: TextMessage = {
      id: responseId,
      type: 'text',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, responseMsg]);
    setInputText('');
    setPhase('processing');
    setStreamingId(responseId);

    // Simulate processing phases based on content keywords
    const toolKeywords = ['open', 'launch', 'start', 'run', 'kill', 'stop', 'play', 'pause', 'volume', 'copy', 'paste', 'shutdown', 'restart', 'lock', 'sleep'];
    const needsTool = toolKeywords.some((kw) => trimmed.toLowerCase().includes(kw));

    try {
      if (needsTool) {
        setPhase('executing_tool');
        const toolMsg: ToolMessage = {
          id: `tool-${Date.now()}`,
          type: 'tool',
          timestamp: Date.now(),
          tool: { name: 'executing command', status: 'running', detail: trimmed },
        };
        setMessages((prev) => [...prev, toolMsg]);
      } else {
        setPhase('searching_memory');
        await new Promise((r) => setTimeout(r, 300));
      }

      setPhase('generating');

      const history = messagesRef.current
        .filter((m) => (m.type === 'user' || m.type === 'text') && 'content' in m && m.content)
        .slice(-10)
        .map((m) => ({
          role: m.type === 'user' ? 'user' as const : 'assistant' as const,
          content: (m as any).content || '',
        }));

      setPhase('streaming');
      streamBufferRef.current = '';
      pendingHandoffsRef.current = [];
      await sendChatApi(trimmed, history, 'deep', (chunk) => {
        streamBufferRef.current += chunk;
        const { clean, actions } = extractHandoffs(streamBufferRef.current);
        if (actions.length) pendingHandoffsRef.current.push(...actions);
        updateMessage(responseId, (msg) => {
          if (msg.type === 'text') {
            return { ...msg, content: clean };
          }
          return msg;
        });
      });
      for (const action of pendingHandoffsRef.current) {
        await executeHandoff(action);
      }
    } catch (e: any) {
      const errMsg: ErrorMessage = {
        id: `err-${Date.now()}`,
        type: 'error',
        content: e.message || 'An error occurred',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setStreamingId(null);
      updateMessage(responseId, (msg) => {
        if (msg.type === 'text') return { ...msg, isStreaming: false };
        return msg;
      });
      setPhase('idle');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Not Available',
        'Speech recognition requires a development build. Press s in Metro, then run npx expo run:android to build the app with native modules.'
      );
      return;
    }
    if (startingRef.current || startedRef.current) return;
    startingRef.current = true;
    stopRequestedRef.current = false;
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Microphone permission is required');
        startingRef.current = false;
        return;
      }
      if (stopRequestedRef.current) {
        startingRef.current = false;
        return;
      }
      await ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
      if (stopRequestedRef.current) {
        // User released before start() resolved — stop immediately
        startedRef.current = false;
        startingRef.current = false;
        setIsRecording(false);
        try { ExpoSpeechRecognitionModule.stop(); } catch {}
        return;
      }
      startedRef.current = true;
      setIsRecording(true);
    } catch (e: any) {
      startingRef.current = false;
      startedRef.current = false;
      stopRequestedRef.current = false;
      Alert.alert('Error', `Could not start voice: ${e?.message ?? 'unknown error'}`);
    } finally {
      startingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!ExpoSpeechRecognitionModule) return;
    if (startingRef.current) {
      // Start still pending — mark it so start() aborts when it resolves
      stopRequestedRef.current = true;
      setIsRecording(false);
      return;
    }
    if (!startedRef.current) return;
    startedRef.current = false;
    setIsRecording(false);
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopResponse = useCallback(() => {
    setPhase('idle');
    setStreamingId(null);
  }, []);

  return {
    messages,
    phase,
    streamingId,
    isRecording,
    inputText,
    setInputText,
    kbHeight,
    isLoaded,
    wsConnected,
    wsState,
    sendMessage,
    startRecording,
    stopRecording,
    clearMessages,
    stopResponse,
  };
}
