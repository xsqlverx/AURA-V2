import { View, Text, Pressable, StyleSheet, Modal as RNModal } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { backgrounds, glass, text, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { opacity } from '../tokens/opacity';
import { duration } from '../tokens/animation';
import GlassButton from './GlassButton';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export default function Dialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: Props) {
  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(duration.normal)} exiting={FadeOut.duration(duration.normal)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View entering={ZoomIn.duration(duration.deliberate).springify()} exiting={ZoomOut.duration(duration.normal)} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <GlassButton variant="secondary" onPress={onCancel}>
              {cancelLabel}
            </GlassButton>
            <GlassButton variant={destructive ? 'danger' : 'primary'} onPress={onConfirm}>
              {confirmLabel}
            </GlassButton>
          </View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `rgba(0,0,0,${opacity.overlay})`,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.space32,
  },
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space24,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    ...typography.heading3,
    color: text.primary,
    marginBottom: spacing.space8,
  },
  message: {
    ...typography.bodySmall,
    color: text.secondary,
    marginBottom: spacing.space24,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.space12,
  },
});
