import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProcesses } from '../src/api/aura';
import { colors } from '../src/theme';

export default function ProcessesScreen() {
  const [processes, setProcesses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [count, setCount] = useState(0);

  const loadProcesses = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const data = await getProcesses(search || undefined);
      if (data.processes) {
        setProcesses(data.processes);
        setCount(data.count);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadProcesses(); }, [loadProcesses]));

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>{item}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Processes</Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      <TextInput
        style={styles.search}
        value={filter}
        onChangeText={(t) => { setFilter(t); loadProcesses(t); }}
        placeholder="Filter processes..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        data={processes}
        keyExtractor={(item, i) => item + i}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => loadProcesses(filter)} tintColor={colors.accentCyan} colors={[colors.accentCyan]} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>{loading ? 'Loading...' : 'No matching processes'}</Text>
          </View>
        }
      />
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
  search: {
    backgroundColor: colors.bgSecondary, color: colors.textPrimary,
    borderRadius: 10, padding: 12, fontSize: 14,
    margin: 16, borderWidth: 1, borderColor: colors.border,
  },
  list: { paddingHorizontal: 16, gap: 4 },
  item: {
    backgroundColor: colors.bgSecondary, borderRadius: 8, padding: 12,
  },
  itemText: { color: colors.textSecondary, fontSize: 12, fontFamily: 'monospace' },
  center: { alignItems: 'center', paddingTop: 80 },
  muted: { color: colors.textMuted, fontSize: 16 },
});
