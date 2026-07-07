import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fileList, fileOpen } from '../src/api/aura';
import { colors, spacing, radius, typography } from '../src/theme';
import GlassCard from '../src/components/GlassCard';

type DirEntry = { name: string; isFolder: boolean };

export default function FilesScreen() {
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError('');
    try {
      const data: any = await fileList(dir);
      if (data.error) { setError(data.error); setEntries([]); }
      else if (data.folders || data.files) {
        const items: DirEntry[] = [
          ...(data.folders || []).map((f: string) => ({ name: f, isFolder: true })),
          ...(data.files || []).map((f: string) => ({ name: f, isFolder: false })),
        ];
        setEntries(items);
      }
      else { setEntries([]); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadDir(path); }, [loadDir, path]));

  const navigate = (name: string, isFolder: boolean) => {
    if (isFolder) {
      setHistory((h) => [...h, path]);
      const newPath = path === '.' ? name : path.replace(/\\/g, '/') + '/' + name;
      setPath(newPath.replace(/\\/g, '/'));
    } else {
      handleOpen(path + '/' + name);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setPath(prev);
    }
  };

  const handleOpen = async (p: string) => {
    try {
      const res = await fileOpen(p);
      if (res.error) Alert.alert('Error', res.error);
      else Alert.alert('Opened', `Opened on PC`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const renderItem = ({ item, index }: { item: DirEntry; index: number }) => (
    <Animated.View entering={FadeInDown.duration(150).delay(Math.min(index * 20, 200))}>
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        onPress={() => navigate(item.name, item.isFolder)}
      >
        <GlassCard>
          <View style={styles.itemRow}>
            <Text style={[styles.itemIcon, { color: colors.primary }]}>{item.isFolder ? '⊞' : '⊡'}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemArrow}>{item.isFolder ? '>' : ''}</Text>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {history.length > 0 ? (
          <Pressable onPress={goBack}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
        ) : <View />}
        <Text style={styles.headerTitle} numberOfLines={1}>Files</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.pathText}>⊞ {path}</Text>
      {error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => item.name + i}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadDir(path)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>{loading ? 'Loading...' : 'Empty directory'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerTitle: { ...typography.headlineMd, color: colors.primary, fontSize: 18 },
  backBtn: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  pathText: { ...typography.mono, color: colors.onSurface, paddingHorizontal: 16, paddingVertical: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.xs },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  itemIcon: { fontSize: 18 },
  itemName: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  itemArrow: { color: colors.onSurface, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.onSurface, fontSize: 16 },
  error: { color: colors.error, fontSize: 14 },
});
