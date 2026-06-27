import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getMemory } from '../../src/api/aura';
import { colors } from '../../src/theme';

type MemoryEntry = { id: string; text: string; metadata?: any };

export default function MemoryScreen() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMemory();
      setEntries(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item, index }: { item: MemoryEntry; index: number }) => (
    <Animated.View
      entering={FadeInDown.duration(200).delay(Math.min(index * 30, 300))}
      style={styles.card}
    >
      <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
      {item.metadata?.timestamp && (
        <Text style={styles.timestamp}>
          {new Date(item.metadata.timestamp * 1000).toLocaleString()}
        </Text>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Memory</Text>
        <Text style={styles.count}>{entries.length} entries</Text>
      </View>
      {error && !loading ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry} onPress={load}>Retry</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={colors.accentCyan}
              colors={[colors.accentCyan]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>
                {loading ? 'Loading memories...' : 'No memories yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.accentCyan, fontSize: 20, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 13 },
  list: { padding: 16, gap: 8 },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14, gap: 4,
  },
  text: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  timestamp: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  muted: { color: colors.textMuted, fontSize: 16 },
  error: { color: colors.accentRed, fontSize: 14 },
  retry: { color: colors.accentCyan, fontSize: 14, marginTop: 4 },
});
