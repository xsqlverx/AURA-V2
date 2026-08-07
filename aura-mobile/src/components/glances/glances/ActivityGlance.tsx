import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { getNews } from '../../../api/aura';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

type NewsItem = {
  title: string;
  source?: string;
  url?: string;
  published_at?: string;
  summary?: string;
};

export default function ActivityGlance() {
  const { updateGlanceData } = useGlance();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    getNews(10).then((d) => {
      const list = Array.isArray(d) ? d : d.articles || d.headlines || [];
      setNews(list);
      updateGlanceData('activity', list);
    }).catch(() => {});
  }, []);

  const handleOpen = (item: NewsItem) => {
    haptic.press();
    if (item.url) {
      // Open in browser — expo-web-browser or Linking
    }
  };

  return (
    <View style={styles.container}>
      <GlanceHeader icon="newspaper" title="Recent Activity" subtitle={news.length > 0 ? `${news.length} headlines` : undefined} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {news.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="newspaper" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>No recent headlines</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {news.map((item, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <Animated.View
                  key={`news-${i}`}
                  entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 30, 400))}
                >
                  <Pressable
                    onPress={() => {
      haptic.press();
      setExpandedIndex((prev) => prev === i ? null : i);
                    }}
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceText}>{item.source || 'News'}</Text>
                      </View>
                      {item.published_at && (
                        <Text style={styles.dateText}>{item.published_at}</Text>
                      )}
                    </View>

                    <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
                      {item.title}
                    </Text>

                    {isExpanded && item.summary && (
                      <Text style={styles.summary}>{item.summary}</Text>
                    )}

                    {isExpanded && item.url && (
                      <View style={styles.linkRow}>
                        <Icon name="external-link" size={12} color={accent.cyan} />
                        <Text style={styles.linkText} numberOfLines={1}>Open article</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.space20,
  },
  list: {
    paddingTop: spacing.space12,
    gap: spacing.space8,
    paddingBottom: spacing.space24,
  },
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space12,
    gap: spacing.space8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
    backgroundColor: `${accent.cyan}10`,
  },
  sourceText: {
    ...typography.caption,
    fontSize: 9,
    color: accent.cyan,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  title: {
    ...typography.bodySmall,
    color: text.primary,
    lineHeight: 20,
  },
  summary: {
    ...typography.caption,
    color: text.secondary,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingTop: spacing.space4,
  },
  linkText: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.space40,
    gap: spacing.space8,
  },
  emptyText: {
    ...typography.bodySmall,
    color: text.tertiary,
  },
});
