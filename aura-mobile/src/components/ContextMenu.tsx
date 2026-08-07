import { View, Text, Pressable, StyleSheet, Modal as RNModal } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import Icon from './Icon';
import { glass, text, semantic } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { opacity } from '../tokens/opacity';
import { duration, stagger } from '../tokens/animation';

type Action = {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  actions: Action[];
  position?: { x: number; y: number };
};

export default function ContextMenu({ visible, onClose, actions, position }: Props) {
  if (!visible) return null;

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={ZoomIn.duration(duration.fast).springify()}
          exiting={ZoomOut.duration(duration.fast)}
          style={[
            styles.menu,
            position ? { position: 'absolute', top: position.y, left: position.x } : undefined,
          ]}
        >
          {actions.map((action, i) => (
            <Animated.View
              key={action.label}
              entering={FadeIn.duration(duration.normal).delay(i * stagger.fast)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  pressed && { opacity: opacity.pressed },
                ]}
                onPress={() => { action.onPress(); onClose(); }}
              >
                <Icon
                  name={action.icon}
                  size={16}
                  color={action.destructive ? semantic.error : text.secondary}
                />
                <Text
                  style={[
                    styles.label,
                    action.destructive && { color: semantic.error },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.space4,
    minWidth: 180,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingVertical: spacing.space12,
    paddingHorizontal: spacing.space16,
  },
  label: {
    ...typography.body,
    color: text.primary,
  },
});
