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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { TopHudBar } from '../../src/components/navigation/TopHudBar';
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar';
import { ParticleBackground } from '../../src/components/effects/ParticleBackground';
import { vaultList, vaultRead, vaultCreate, vaultDelete } from '../../src/api/client';

type Note = { title: string; modified_at?: string; folder?: string };

export default function NotesScreen() {
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

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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
    Alert.alert('Delete Note', `Delete "${title}" from Obsidian vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultDelete(title);
            loadNotes();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete note');
          }
        },
      },
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
          <Text style={styles.noteIcon}>📋</Text>
        </View>
        <View style={styles.noteInfo}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.modified_at ? <Text style={styles.noteDate}>{item.modified_at}</Text> : null}
        </View>
        <Text style={styles.noteChevron}>›</Text>
      </Pressable>
    </Animated.View>
  );

  if (selected) {
    return (
      <SafeAreaView style={styles.container}>
        <ParticleBackground />
        <TopHudBar title={selected.title} subtitle="OBSIDIAN VAULT NOTE" showBack />
        <ScrollView style={styles.detailScroll} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.detailCard}>
            <Text style={styles.detailContent}>{selected.content}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
            <Text style={styles.closeBtnText}>← BACK TO VAULT</Text>
          </Pressable>
        </ScrollView>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <TopHudBar title="VAULT" subtitle={`${notes.length} OBSIDIAN NOTES`} />

      {/* Action Strip */}
      <View style={styles.actionStrip}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search vault notes..."
            placeholderTextColor={Colors.text.dim}
          />
        </View>

        <Pressable style={styles.addBtn} onPress={() => setCreating(!creating)}>
          <Text style={styles.addBtnText}>{creating ? '✕' : '+ NEW'}</Text>
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
            placeholder="Markdown content..."
            placeholderTextColor={Colors.text.dim}
            multiline
          />
          <Pressable
            style={[
              styles.createBtn,
              (!newTitle.trim() || !newContent.trim()) && styles.createBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || !newContent.trim()}
          >
            <Text style={styles.createBtnText}>SAVE TO VAULT</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Notes List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.title}
        renderItem={renderNote}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.cyan.primary}
            colors={[Colors.cyan.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              {search
                ? `No notes matching "${search}"`
                : loading
                ? 'Indexing Obsidian vault...'
                : 'No notes found. Create a new note or connect PC.'}
            </Text>
          </View>
        }
      />

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    height: 38,
  },
  searchIcon: { fontSize: 13 },
  searchInput: {
    flex: 1,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  addBtn: {
    backgroundColor: Colors.purple.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  createSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: 'rgba(17, 16, 24, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
  },
  createInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.primary,
  },
  createContent: { minHeight: 70, textAlignVertical: 'top' },
  createBtn: {
    backgroundColor: Colors.cyan.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 1,
  },

  list: {
    padding: 16,
    gap: 8,
    paddingBottom: 110,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(17, 16, 24, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 83, 153, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: { fontSize: 16 },
  noteInfo: { flex: 1, gap: 2 },
  noteTitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  noteDate: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9.5,
    color: Colors.text.dim,
  },
  noteChevron: {
    fontSize: 18,
    color: Colors.text.dim,
    fontFamily: 'JetBrains Mono, Menlo, monospace',
  },

  detailScroll: { flex: 1 },
  detailCard: {
    backgroundColor: 'rgba(17, 16, 24, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 16,
  },
  detailContent: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: 'rgba(106, 83, 153, 0.2)',
    borderWidth: 1,
    borderColor: Colors.purple.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 100,
  },
  closeBtnText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.purple.light,
    letterSpacing: 1,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    color: Colors.text.dim,
    textAlign: 'center',
  },
});
