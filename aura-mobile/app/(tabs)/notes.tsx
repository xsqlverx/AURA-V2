import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, Alert, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { vaultList, vaultRead, vaultCreate, vaultDelete } from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassButton from '../../src/components/GlassButton';
import GlassInput from '../../src/components/GlassInput';

type Note = { title: string; path?: string };

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ title: string; content: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultList();
      if (data.notes) setNotes(data.notes);
      else if (data.error) setNotes([]);
      else setNotes([]);
    } catch { setNotes([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadNotes(); }, [loadNotes]));

  const handleRead = async (title: string) => {
    try {
      const data = await vaultRead(title);
      setSelected({ title, content: data.content || data.text || '(empty)' });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await vaultCreate(newTitle.trim(), newContent.trim());
      Alert.alert('Created', 'Note created');
      setNewTitle('');
      setNewContent('');
      setCreating(false);
      loadNotes();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (title: string) => {
    Alert.alert('Delete', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await vaultDelete(title); loadNotes(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderItem = ({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.duration(200).delay(Math.min(index * 30, 300))}>
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        onPress={() => handleRead(item.title)}
        onLongPress={() => handleDelete(item.title)}
      >
        <GlassCard>
          <View style={styles.noteRow}>
            <View style={styles.noteIconWrap}>
              <MaterialIcons name="description" size={18} color={colors.primary} />
            </View>
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceMuted} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );

  if (selected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{selected.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noteContentWrap}>
          <GlassCard>
            <Text style={styles.noteContent}>{selected.content}</Text>
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notes</Text>
          <Text style={styles.headerSub}>{notes.length} notes</Text>
        </View>
        <Pressable onPress={() => setCreating(!creating)} style={styles.addBtn}>
          <MaterialIcons name={creating ? 'close' : 'add'} size={20} color="#050505" />
        </Pressable>
      </View>

      {creating && (
        <View style={styles.createSection}>
          <GlassInput
            style={styles.createInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Note title"
          />
          <GlassInput
            style={[styles.createInput, styles.createContent]}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="Note content..."
            multiline
          />
          <GlassButton variant="primary" onPress={handleCreate}>
            Create Note
          </GlassButton>
        </View>
      )}

      <FlatList
        data={notes}
        keyExtractor={(item, i) => item.title + i}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotes} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="edit-note" size={40} color={colors.onSurfaceDim} />
            <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No notes yet'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  headerSub: { color: colors.onSurface, fontSize: 11, fontWeight: '500', marginTop: 2 },
  backBtn: { padding: 6, borderRadius: 8 },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  noteIconWrap: { width: 32, height: 32, borderRadius: spacing.sm, backgroundColor: 'rgba(0,242,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  noteTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600', flex: 1 },
  noteContentWrap: { padding: spacing.lg, flex: 1 },
  noteContent: { ...typography.bodyMd, color: colors.onSurface },
  createSection: { padding: spacing.lg, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  createInput: {},
  createContent: { minHeight: 80, textAlignVertical: 'top' },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyText: { color: colors.onSurface, fontSize: 14 },
});
