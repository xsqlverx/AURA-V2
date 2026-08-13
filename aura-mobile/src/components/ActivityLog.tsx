import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../theme';
import { text, glass, accent, semantic } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { getActivitySummary } from '../api/aura';
import { haptic } from '../motion/haptics';
import Icon from './Icon';
import { duration } from '../tokens/animation';

type ActivityEvent = {
  ts: string;
  type: string;
  [key: string]: any;
};

type TopApp = { app: string; foreground_s: number };
type Website = { url: string; title: string; browser: string; ts: string };
type Search = { term: string; browser: string; ts: string };

type Summary = {
  hours: number;
  boots: ActivityEvent[];
  logons: ActivityEvent[];
  launches_count: number;
  top_apps: TopApp[];
  websites: Website[];
  searches: Search[];
};

type Tab = 'timeline' | 'apps' | 'web';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function timeAgo(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = Math.max(0, now - then);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url.slice(0, 40);
  }
}

const EVENT_ICONS: Record<string, string> = {
  boot: 'power',
  logon: 'log-in',
  app_launch: 'rocket',
  foreground: 'monitor',
  website: 'globe',
  search: 'search',
};

const EVENT_COLORS: Record<string, string> = {
  boot: '#22C55E',
  logon: '#38BDF8',
  app_launch: '#A78BFA',
  foreground: '#F59E0B',
  website: '#F472B6',
  search: '#34D399',
};

export default function ActivityLog() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getActivitySummary(24);
      setSummary(data);
    } catch {}
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic.press();
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);

  const allEvents: ActivityEvent[] = [];
  if (summary) {
    for (const b of summary.boots) allEvents.push({ ...b, type: 'boot' });
    for (const l of summary.logons) allEvents.push({ ...l, type: 'logon' });
    for (const w of summary.websites) allEvents.push({ ...w, type: 'website', ts: w.ts });
    for (const s of summary.searches) allEvents.push({ ...s, type: 'search', ts: s.ts });
  }
  allEvents.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'timeline', label: 'Timeline', icon: 'clock' },
    { key: 'apps', label: 'Apps', icon: 'grid' },
    { key: 'web', label: 'Web', icon: 'globe' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => { haptic.press(); setActiveTab(tab.key); }}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Icon name={tab.icon as any} size={14} color={activeTab === tab.key ? accent.cyan : text.tertiary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent.cyan} />}
      >
        {!summary ? (
          <View style={styles.empty}>
            <Icon name="activity" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>Loading activity...</Text>
          </View>
        ) : activeTab === 'timeline' ? (
          <TimelineView events={allEvents} />
        ) : activeTab === 'apps' ? (
          <AppsView apps={summary.top_apps} launches={summary.launches_count} />
        ) : (
          <WebView websites={summary.websites} searches={summary.searches} />
        )}
      </ScrollView>
    </View>
  );
}

function TimelineView({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="clock" size={28} color={text.tertiary} />
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {events.map((e, i) => {
        const icon = EVENT_ICONS[e.type] || 'circle';
        const color = EVENT_COLORS[e.type] || text.tertiary;
        let label = '';
        if (e.type === 'boot') label = 'System booted';
        else if (e.type === 'logon') label = `Logged in${e.user ? ` as ${e.user}` : ''}`;
        else if (e.type === 'website') label = extractDomain(e.url || '');
        else if (e.type === 'search') label = `"${e.term || ''}"`;

        return (
          <Animated.View key={`evt-${i}`} entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}>
            <View style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: `${color}20` }]}>
                <Icon name={icon as any} size={12} color={color} />
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventLabel} numberOfLines={1}>{label}</Text>
                <Text style={styles.eventMeta}>{e.ts ? timeAgo(e.ts) : ''}</Text>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function AppsView({ apps, launches }: { apps: TopApp[]; launches: number }) {
  const maxDur = apps.length > 0 ? apps[0].foreground_s : 1;
  return (
    <View style={styles.list}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{apps.length}</Text>
          <Text style={styles.summaryLabel}>Apps tracked</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{launches}</Text>
          <Text style={styles.summaryLabel}>Launches</Text>
        </View>
      </View>
      {apps.map((app, i) => (
        <Animated.View key={`app-${i}`} entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 30, 400))}>
          <View style={styles.appRow}>
            <View style={styles.appInfo}>
              <Text style={styles.appName} numberOfLines={1}>{app.app}</Text>
              <Text style={styles.appDuration}>{formatDuration(app.foreground_s)}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.max(4, (app.foreground_s / maxDur) * 100)}%` }]} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function WebView({ websites, searches }: { websites: Website[]; searches: Search[] }) {
  return (
    <View style={styles.list}>
      {searches.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Searches</Text>
          {searches.map((s, i) => (
            <Animated.View key={`srch-${i}`} entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}>
              <View style={styles.searchRow}>
                <Icon name="search" size={12} color={semantic.success} />
                <Text style={styles.searchTerm} numberOfLines={1}>{s.term}</Text>
                <Text style={styles.searchMeta}>{s.browser}</Text>
              </View>
            </Animated.View>
          ))}
        </>
      )}
      {websites.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.space16 }]}>Websites</Text>
          {websites.map((w, i) => (
            <Animated.View key={`web-${i}`} entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}>
              <View style={styles.webRow}>
                <View style={styles.webInfo}>
                  <Text style={styles.webTitle} numberOfLines={1}>{w.title || extractDomain(w.url)}</Text>
                  <Text style={styles.webUrl} numberOfLines={1}>{extractDomain(w.url)}</Text>
                </View>
                <Text style={styles.webMeta}>{w.browser}</Text>
              </View>
            </Animated.View>
          ))}
        </>
      )}
      {websites.length === 0 && searches.length === 0 && (
        <View style={styles.empty}>
          <Icon name="globe" size={28} color={text.tertiary} />
          <Text style={styles.emptyText}>No browser activity yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.space20,
    paddingTop: spacing.space8,
    gap: spacing.space8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.space8,
    borderRadius: radius.sm,
    backgroundColor: `${glass.border}`,
  },
  tabActive: {
    backgroundColor: `${accent.cyan}15`,
  },
  tabText: { ...typography.caption, color: text.tertiary, fontSize: 11 },
  tabTextActive: { color: accent.cyan, fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: spacing.space20 },
  list: { paddingTop: spacing.space12, gap: spacing.space8, paddingBottom: spacing.space24 },
  empty: { alignItems: 'center', paddingTop: spacing.space40, gap: spacing.space8 },
  emptyText: { ...typography.bodySmall, color: text.tertiary },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12, paddingVertical: spacing.space8 },
  eventDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventContent: { flex: 1 },
  eventLabel: { ...typography.bodySmall, color: text.primary },
  eventMeta: { ...typography.caption, color: text.tertiary, fontSize: 10 },

  summaryRow: { flexDirection: 'row', gap: spacing.space12, marginBottom: spacing.space12 },
  summaryItem: { flex: 1, backgroundColor: glass.bg, borderRadius: radius.md, borderWidth: 1, borderColor: glass.border, padding: spacing.space12, alignItems: 'center' },
  summaryValue: { ...typography.heading3, color: accent.cyan, fontWeight: '700' },
  summaryLabel: { ...typography.caption, color: text.tertiary, fontSize: 10 },

  appRow: { gap: spacing.space4 },
  appInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { ...typography.bodySmall, color: text.primary, flex: 1 },
  appDuration: { ...typography.caption, color: accent.cyan, fontWeight: '600' },
  barBg: { height: 4, borderRadius: 2, backgroundColor: `${glass.border}` },
  barFill: { height: 4, borderRadius: 2, backgroundColor: accent.cyan },

  sectionTitle: { ...typography.caption, color: text.tertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, marginBottom: spacing.space4 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space8, paddingVertical: spacing.space4 },
  searchTerm: { ...typography.bodySmall, color: text.primary, flex: 1 },
  searchMeta: { ...typography.caption, color: text.tertiary, fontSize: 9 },

  webRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space8, paddingVertical: spacing.space4 },
  webInfo: { flex: 1 },
  webTitle: { ...typography.bodySmall, color: text.primary },
  webUrl: { ...typography.caption, color: text.tertiary, fontSize: 10 },
  webMeta: { ...typography.caption, color: text.tertiary, fontSize: 9 },
});
