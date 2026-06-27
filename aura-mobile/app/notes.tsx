import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  SafeAreaView, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { vaultList, vaultRead, vaultCreate, vaultDelete } from '../src/api/aura';
import { colors } from '../src/theme';

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
        style={({ pressed }) => [styles.noteItem, pressed && { opacity: 0.7 }]}
        onPress={() => handleRead(item.title)}
        onLongPress={() => handleDelete(item.title)}
      >
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.noteArrow}>→</Text>
      </Pressable>
    </Animated.View>
  );

  if (selected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{selected.title}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={styles.noteContent}>{selected.content}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <Pressable onPress={() => setCreating(!creating)}>
          <Text style={styles.addBtn}>{creating ? 'Cancel' : '+ New'}</Text>
        </Pressable>
      </View>

      {creating && (
        <View style={styles.createSection}>
          <TextInput
            style={styles.createInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Note title"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.createInput, styles.createContent]}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="Note content..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create Note</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={notes}
        keyExtractor={(item, i) => item.title + i}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotes} tintColor={colors.accentCyan} colors={[colors.accentCyan]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No notes yet'}</Text>
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
  headerTitle: { color: colors.accentCyan, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  backBtn: { color: colors.accentCyan, fontSize: 14, fontWeight: '600' },
  addBtn: { color: colors.accentCyan, fontSize: 14, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  noteItem: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  noteTitle: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  noteArrow: { color: colors.textMuted, fontSize: 16 },
  noteContent: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  createSection: { padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  createInput: {
    backgroundColor: colors.bgSecondary, color: colors.textPrimary,
    borderRadius: 10, padding: 12, fontSize: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  createContent: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: {
    backgroundColor: colors.accentCyan, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
});
