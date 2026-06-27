import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fileList, fileOpen } from '../src/api/aura';
import { colors } from '../src/theme';

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
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
        onPress={() => navigate(item.name, item.isFolder)}
      >
        <Text style={styles.itemIcon}>{item.isFolder ? '📁' : '📄'}</Text>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemArrow}>{item.isFolder ? '>' : ''}</Text>
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
      <Text style={styles.pathText} numberOfLines={1}>📁 {path}</Text>
      {error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => item.name + i}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadDir(path)} tintColor={colors.accentCyan} colors={[colors.accentCyan]} />
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
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.accentCyan, fontSize: 18, fontWeight: '700' },
  backBtn: { color: colors.accentCyan, fontSize: 14, fontWeight: '600' },
  pathText: { color: colors.textMuted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  list: { padding: 16, gap: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 14,
  },
  itemIcon: { fontSize: 18 },
  itemName: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  itemArrow: { color: colors.textMuted, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.textMuted, fontSize: 16 },
  error: { color: colors.accentRed, fontSize: 14 },
});
