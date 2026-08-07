import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { getProcesses, killProcess } from '../../../api/aura';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

type Proc = {
  pid: number;
  name: string;
  cpu_percent?: number;
  memory_mb?: number;
};

export default function ProcessesGlance() {
  const { updateGlanceData } = useGlance();
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const loadProcesses = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const d = await getProcesses(filter || undefined, true);
      const list = d.processes || [];
      setProcesses(list);
      updateGlanceData('processes', list);
    } catch {
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, [updateGlanceData]);

  useEffect(() => {
    loadProcesses();
  }, []);

  const filtered = search
    ? processes.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        `${p.pid}`.includes(search)
      )
    : processes;

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const handleKill = async (proc: Proc) => {
    haptic.press();
    try {
      await killProcess(proc.pid);
      setProcesses((prev) => prev.filter((p) => p.pid !== proc.pid));
    } catch {}
  };

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
  }, []);

  return (
    <View style={styles.container}>
      <GlanceHeader
        icon="developer-board"
        title="Processes"
        subtitle={`${processes.length} running`}
      />

      <View style={styles.stickySearch}>
        <View style={styles.searchRow}>
          <Icon name="search" size={14} color={text.tertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search by name or PID..."
            placeholderTextColor={text.tertiary}
          />
          {search ? (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <Icon name="close" size={14} color={text.tertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {loading && processes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading processes...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="developer-board" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>
              {search ? `No processes matching "${search}"` : 'No processes loaded'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {paginated.map((proc, i) => (
              <Animated.View
                key={`${proc.pid}`}
                entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 15, 300))}
              >
                <View style={styles.row}>
                  <View style={styles.pidBadge}>
                    <Text style={styles.pidText}>{proc.pid}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{proc.name}</Text>
                    <View style={styles.metaRow}>
                      {proc.cpu_percent != null && (
                        <Text style={styles.meta}>{proc.cpu_percent.toFixed(1)}% CPU</Text>
                      )}
                      {proc.memory_mb != null && (
                        <>
                          <Text style={styles.metaSep}>·</Text>
                          <Text style={styles.meta}>{proc.memory_mb.toFixed(0)} MB</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Pressable onPress={() => handleKill(proc)} style={styles.killBtn}>
                    <Icon name="close" size={12} color={semantic.error} />
                  </Pressable>
                </View>
              </Animated.View>
            ))}
            {hasMore && (
              <Pressable onPress={() => setPage((p) => p + 1)} style={styles.loadMore}>
                <Text style={styles.loadMoreText}>Load more ({filtered.length - paginated.length} remaining)</Text>
              </Pressable>
            )}
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
  stickySearch: {
    paddingHorizontal: spacing.space20,
    paddingTop: spacing.space12,
    paddingBottom: spacing.space8,
    backgroundColor: '#0A0A0A',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: glass.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: spacing.space12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: text.primary,
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.space20,
  },
  list: {
    paddingTop: spacing.space4,
    gap: spacing.space4,
    paddingBottom: spacing.space24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    backgroundColor: glass.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.space12,
  },
  pidBadge: {
    minWidth: 48,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  pidText: {
    ...typography.mono,
    fontSize: 10,
    color: text.tertiary,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  meta: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  metaSep: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  killBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: `${semantic.error}12`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${semantic.error}25`,
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
  loadMore: {
    alignItems: 'center',
    paddingVertical: spacing.space12,
  },
  loadMoreText: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
  },
});
