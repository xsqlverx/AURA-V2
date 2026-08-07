import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, RefreshControl, Alert, Modal, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getMemory, createMemory, updateMemory, deleteMemory } from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassButton from '../../src/components/GlassButton';
import GlassInput from '../../src/components/GlassInput';

type MemoryEntry = { id: string; text: string; metadata?: any };

export default function MemoryScreen() {
  const navigation = useNavigation<DrawerNavigationProp<{}>>();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newText, setNewText] = useState('');
  const [editEntry, setEditEntry] = useState<MemoryEntry | null>(null);
  const [editText, setEditText] = useState('');

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

  const handleCreate = async () => {
    if (!newText.trim()) return;
    try {
      await createMemory(newText.trim());
      setNewText('');
      setShowCreate(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleUpdate = async () => {
    if (!editEntry || !editText.trim()) return;
    try {
      await updateMemory(editEntry.id, editText.trim());
      setEditEntry(null);
      setEditText('');
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (item: MemoryEntry) => {
    Alert.alert('Delete Memory', 'Remove this memory entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteMemory(item.id); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: MemoryEntry; index: number }) => (
    <Animated.View entering={FadeInDown.duration(200).delay(Math.min(index * 30, 300))}>
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        onPress={() => { setEditEntry(item); setEditText(item.text); }}
        onLongPress={() => handleDelete(item)}
      >
        <GlassCard>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="psychology" size={14} color={colors.secondary} />
            </View>
            {item.metadata?.timestamp && (
              <Text style={styles.timestamp}>
                {new Date(item.metadata.timestamp * 1000).toLocaleDateString()}
              </Text>
            )}
          </View>
          <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <MaterialIcons name="menu" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Memory</Text>
          <Text style={styles.headerSub}>{entries.length} entries</Text>
        </View>
        <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
          <MaterialIcons name="add" size={20} color="#050505" />
        </Pressable>
      </View>

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>New Memory</Text>
            </View>
            <GlassInput
              style={styles.modalInput}
              value={newText}
              onChangeText={setNewText}
              placeholder="Enter memory..."
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <GlassButton variant="secondary" onPress={() => { setShowCreate(false); setNewText(''); }}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" onPress={handleCreate}>
                Save
              </GlassButton>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal visible={!!editEntry} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Edit Memory</Text>
            </View>
            <GlassInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              placeholder="Edit memory..."
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <GlassButton variant="secondary" onPress={() => setEditEntry(null)}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" onPress={handleUpdate}>
                Update
              </GlassButton>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {error && !loading ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={32} color={colors.error} />
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
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialIcons name="psychology" size={40} color={colors.onSurfaceDim} />
              <Text style={styles.muted}>{loading ? 'Loading memories...' : 'No memories yet'}</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 28,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.input,
    backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  headerSub: { color: colors.onSurface, fontSize: 11, fontWeight: '500', marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(188,140,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  text: { ...typography.bodyMd, color: colors.onSurface },
  timestamp: { ...typography.mono, color: colors.onSurface },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', padding: spacing.xl,
  },
  modal: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  modalTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 16 },
  modalInput: { minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingTop: 80 },
  muted: { color: colors.onSurface, fontSize: 14 },
  error: { color: colors.error, fontSize: 13 },
  retry: { color: colors.primary, fontSize: 13, marginTop: 4 },
});
