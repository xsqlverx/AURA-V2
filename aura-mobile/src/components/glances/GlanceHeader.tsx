import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import Icon from '../Icon';
import { text, glass, accent, backgrounds } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing, iconSize } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
};

export default function GlanceHeader({ icon, title, subtitle }: Props) {
  const navigation = useNavigation<DrawerNavigationProp<{}>>();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Icon name="menu" size={20} color={text.primary} />
        </Pressable>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={iconSize.list} color={accent.cyan} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space20,
    paddingTop: spacing.space24,
    paddingBottom: spacing.space12,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
    backgroundColor: backgrounds.deep,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: `${accent.cyan}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.heading2,
    color: text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: text.secondary,
    marginTop: 1,
  },
});
