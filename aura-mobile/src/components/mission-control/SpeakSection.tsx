import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../theme/index';
import { typography } from '../../tokens/typography';
import { text, glass, accent, semantic } from '../../tokens/colors';
import Icon from '../Icon';
import { speak } from '../../api/aura';
import { usePresets } from '../../stores/presetsStore';
import { haptic } from '../../motion/haptics';

export default function SpeakSection() {
  const { presets, loaded, load, add, remove } = usePresets();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const handleSpeak = async (sentence: string) => {
    const trimmed = sentence.trim();
    if (!trimmed || busy) return;
    haptic.press();
    setBusy(true);
    try {
      await speak(trimmed);
    } catch {
      // silent — TTS failure should not crash the UI
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setInput('');
    await handleSpeak(trimmed);
  };

  const handleAddPreset = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    haptic.toggle();
    setInput('');
    await add(trimmed);
  };

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(600)} style={styles.container}>
      <View style={styles.header}>
        <Icon name="campaign" size={16} color={accent.cyan} />
        <Text style={styles.title}>Speak</Text>
        <Text style={styles.subtitle}>Through your PC</Text>
      </View>

      <View style={styles.chips}>
        {presets.map((p) => (
          <View key={p} style={styles.chipWrap}>
            <Pressable
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => handleSpeak(p)}
              disabled={busy}
            >
              <Text style={styles.chipText} numberOfLines={1}>{p}</Text>
            </Pressable>
            <Pressable
              style={styles.chipRemove}
              onPress={() => remove(p)}
              hitSlop={8}
              accessibilityLabel={`Remove ${p}`}
            >
              <Icon name="close" size={12} color={text.tertiary} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type anything for Aura to say..."
          placeholderTextColor={text.tertiary}
          multiline
          maxLength={280}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          style={({ pressed }) => [styles.speakBtn, pressed && styles.btnPressed, (busy || !input.trim()) && styles.btnDisabled]}
          onPress={handleSend}
          disabled={busy || !input.trim()}
          accessibilityLabel="Speak"
        >
          <Icon name="campaign" size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
        onPress={handleAddPreset}
        disabled={!input.trim()}
      >
        <Icon name="add" size={14} color={accent.cyan} />
        <Text style={styles.addText}>Save as preset</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: glass.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.body,
    color: text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: text.secondary,
    marginLeft: 'auto',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${accent.cyan}12`,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: `${accent.cyan}30`,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 200,
  },
  chipPressed: {
    backgroundColor: `${accent.cyan}22`,
  },
  chipText: {
    ...typography.bodySmall,
    color: text.primary,
  },
  chipRemove: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    color: text.primary,
    ...typography.bodySmall,
    maxHeight: 88,
  },
  speakBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    backgroundColor: accent.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addText: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
  },
});
