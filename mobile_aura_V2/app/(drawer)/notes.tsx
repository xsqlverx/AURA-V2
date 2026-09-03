import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { vaultList, vaultRead, vaultCreate, vaultDelete } from '../../src/api/client';

type Note = { title: string; modified_at?: string; folder?: string };

export default function NotesScreen() {
  const navigation = useNavigation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ title: string; content: string } | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultList();
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, [loadNotes]);

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleRead = async (title: string) => {
    try {
      const data = await vaultRead(title);
      setSelected({ title, content: data.content || '(empty)' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to read note');
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await vaultCreate(newTitle.trim(), newContent.trim());
      setNewTitle('');
      setNewContent('');
      setCreating(false);
      loadNotes();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create note');
    }
  };

  const handleDelete = (title: string) => {
    Alert.alert('Delete', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await vaultDelete(title);
          loadNotes();
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to delete note');
        }
      }},
    ]);
  };

  const renderNote = ({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.duration(200).delay(Math.min(index * 30, 300))}>
      <Pressable
        style={({ pressed }) => [styles.noteCard, pressed && { opacity: 0.85 }]}
        onPress={() => handleRead(item.title)}
        onLongPress={() => handleDelete(item.title)}
      >
        <View style={styles.noteIconWrap}>
          <Text style={styles.noteIcon}>📝</Text>
        </View>
        <View style={styles.noteInfo}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
          {item.modified_at ? <Text style={styles.noteDate}>{item.modified_at}</Text> : null}
        </View>
        <Text style={styles.noteChevron}>›</Text>
      </Pressable>
    </Animated.View>
  );

  if (selected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{selected.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.detailScroll} contentContainerStyle={{ padding: Theme.spacing.md }}>
          <View style={styles.detailCard}>
            <Text style={styles.detailContent}>{selected.content}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.menuBtn}
          onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' })}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerIconText}>📋</Text>
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Notes</Text>
          <Text style={styles.headerSub}>{notes.length} notes</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => setCreating(!creating)}
        >
          <Text style={styles.addBtnText}>{creating ? '✕' : '+'}</Text>
        </Pressable>
      </View>

      {/* Create Form */}
      {creating && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.createSection}>
          <TextInput
            style={styles.createInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Note title"
            placeholderTextColor={Colors.text.dim}
          />
          <TextInput
            style={[styles.createInput, styles.createContent]}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="Note content..."
            placeholderTextColor={Colors.text.dim}
            multiline
          />
          <Pressable
            style={[styles.createBtn, (!newTitle.trim() || !newContent.trim()) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || !newContent.trim()}
          >
            <Text style={styles.createBtnText}>Create Note</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes..."
          placeholderTextColor={Colors.text.dim}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Notes List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.title}
        renderItem={renderNote}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan.primary} colors={[Colors.cyan.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{search ? `No notes matching "${search}"` : loading ? 'Loading...' : 'No notes yet'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    paddingTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
    gap: Theme.spacing.sm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 18, color: Colors.text.primary },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.cyan.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 18 },
  headerTextCol: { flex: 1 },
  headerTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: Colors.cyan.primary,
    borderRadius: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },

  createSection: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  createInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.primary,
  },
  createContent: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: {
    backgroundColor: Colors.cyan.primary,
    borderRadius: Theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.background,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Theme.spacing.md,
    height: 36,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 14,
    color: Colors.text.dim,
  },

  list: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    paddingBottom: 40,
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.cyan.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: { fontSize: 16 },
  noteInfo: { flex: 1, gap: 1 },
  noteTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  noteDate: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 10,
    color: Colors.text.dim,
  },
  noteChevron: {
    fontSize: 18,
    color: Colors.text.dim,
  },

  detailScroll: { flex: 1 },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Theme.spacing.md,
  },
  detailContent: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  backBtn: { padding: 6, borderRadius: 8 },
  backIcon: {
    fontSize: 20,
    color: Colors.cyan.primary,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Theme.spacing.sm,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.dim,
  },
});
