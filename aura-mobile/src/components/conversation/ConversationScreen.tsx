import { View, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from '../Icon';
import { text, glass, accent } from '../../tokens/colors';
import { spacing, iconSize } from '../../tokens/spacing';
import { duration } from '../../tokens/animation';
import { useConversation } from './useConversation';
import MessageList from './MessageList';
import InputBar from './InputBar';
import ConversationAmbient from './ConversationAmbient';
import ContextPanel from './ContextPanel';

export default function ConversationScreen() {
  const router = useRouter();
  const [contextOpen, setContextOpen] = useState(false);
  const {
    messages, phase, streamingId, isRecording, inputText,
    setInputText, kbHeight, isLoaded,
    sendMessage, startRecording, stopRecording, clearMessages,
  } = useConversation();

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [sendMessage, inputText]);

  const handleSuggestionTap = useCallback((text: string) => {
    setInputText(text);
    sendMessage(text);
  }, [sendMessage]);

  const toggleContext = useCallback(() => {
    setContextOpen((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ConversationAmbient phase={phase} />

      <View style={styles.header}>
        <Pressable onPress={() => router.push('/(tabs)/settings')} style={styles.headerBtn}>
          <Icon name="settings" size={iconSize.action} color={text.secondary} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={clearMessages} style={styles.headerBtn}>
            <Icon name="add" size={iconSize.action} color={text.secondary} />
          </Pressable>
          <Pressable onPress={toggleContext} style={[styles.headerBtn, contextOpen && styles.headerBtnActive]}>
            <Icon name="menu" size={iconSize.action} color={contextOpen ? accent.cyan : text.secondary} />
          </Pressable>
        </View>
      </View>

      <MessageList
        messages={messages}
        streamingId={streamingId}
        onSuggestionTap={handleSuggestionTap}
        isLoaded={isLoaded}
      />

      <InputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        onMicIn={startRecording}
        onMicOut={stopRecording}
        isRecording={isRecording}
        disabled={false}
        kbHeight={kbHeight}
      />

      <ContextPanel visible={contextOpen} onClose={toggleContext} phase={phase} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: `${accent.cyan}12`,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
});
