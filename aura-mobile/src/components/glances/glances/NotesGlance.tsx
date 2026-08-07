import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { vaultList, vaultRead, vaultDelete } from '../../../api/aura';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

type Note = {
  title: string;
  path?: string;
  modified_at?: string;
  folder?: string;
  preview?: string;
};

export default function NotesGlance() {
  const { updateGlanceData, contextHint } = useGlance();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    vaultList().then((d) => {
      const list = d.notes || [];
      setNotes(list);
      updateGlanceData('notes', list);
    }).catch(() => {});
  }, []);

  const filtered = (search || contextHint)
    ? notes.filter((n) => {
        const q = (search || contextHint).toLowerCase();
        return n.title.toLowerCase().includes(q) || (n.folder || '').toLowerCase().includes(q);
      })
    : notes;

  const handleRead = async (title: string) => {
    haptic.press();
    setLoading(true);
    try {
      const data = await vaultRead(title);
      setSelected({ title, content: data.content || data.text || '(empty)' });
    } catch {
      setSelected({ title, content: '(error loading note)' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (title: string) => {
    haptic.press();
    try {
      await vaultDelete(title);
      setNotes((prev) => prev.filter((n) => n.title !== title));
    } catch {}
  };

  const getFolders = (): string[] => {
    const folders = new Set<string>();
    notes.forEach((n) => {
      if (n.folder) folders.add(n.folder);
    });
    return Array.from(folders).sort();
  };

  const notesByFolder = () => {
    const grouped: Record<string, Note[]> = {};
    const ungrouped: Note[] = [];
    filtered.forEach((n) => {
      if (n.folder) {
        if (!grouped[n.folder]) grouped[n.folder] = [];
        grouped[n.folder].push(n);
      } else {
        ungrouped.push(n);
      }
    });
    return { grouped, ungrouped };
  };

  const formatPreview = (n: Note): string => {
    if (n.preview) return n.preview;
    return n.title;
  };

  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
            <Icon name="arrow-back" size={18} color={accent.cyan} />
          </Pressable>
          <Text style={styles.detailTitle} numberOfLines={1}>{selected.title}</Text>
          <Pressable onPress={() => handleDelete(selected.title)} style={styles.detailDelete}>
            <Icon name="trash" size={16} color={semantic.error} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.detailContent}>
            <Text style={styles.detailText}>{selected.content}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const { grouped, ungrouped } = notesByFolder();

  return (
    <View style={styles.container}>
      <GlanceHeader icon="edit-note" title="Notes" subtitle={`${notes.length} notes`} />

      <View style={styles.searchRow}>
        <Icon name="search" size={14} color={text.tertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes..."
          placeholderTextColor={text.tertiary}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close" size={14} color={text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="edit-note" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>
              {search ? `No notes matching "${search}"` : 'No notes yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {Object.entries(grouped).map(([folder, folderNotes]) => (
              <View key={folder}>
                <View style={styles.folderHeader}>
                  <Icon name="folder" size={14} color={accent.cyan} />
                  <Text style={styles.folderLabel}>{folder}</Text>
                  <Text style={styles.folderCount}>{folderNotes.length}</Text>
                </View>
                {folderNotes.map((note, i) => (
                  <Animated.View
                    key={note.title}
                    entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}
                  >
                    <NoteRow
                      note={note}
                      onRead={() => handleRead(note.title)}
                      onDelete={() => handleDelete(note.title)}
                    />
                  </Animated.View>
                ))}
              </View>
            ))}
            {ungrouped.map((note, i) => (
              <Animated.View
                key={note.title}
                entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}
              >
                <NoteRow
                  note={note}
                  onRead={() => handleRead(note.title)}
                  onDelete={() => handleDelete(note.title)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NoteRow({ note, onRead, onDelete }: { note: Note; onRead: () => void; onDelete: () => void }) {
  return (
    <Pressable onPress={onRead} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Icon name="description" size={16} color={accent.cyan} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{note.title}</Text>
          <View style={styles.rowMeta}>
            {note.modified_at ? (
              <Text style={styles.rowMetaText}>{note.modified_at}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.rowDelete}>
        <Icon name="pin" size={14} color={text.tertiary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginHorizontal: spacing.space20,
    marginTop: spacing.space12,
    marginBottom: spacing.space8,
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
    gap: spacing.space8,
    paddingBottom: spacing.space24,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space4,
    marginTop: spacing.space8,
  },
  folderLabel: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  folderCount: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
    marginLeft: 'auto',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    backgroundColor: glass.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.space12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: `${accent.cyan}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  rowMetaText: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  rowDelete: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space20,
    paddingVertical: spacing.space12,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    ...typography.heading3,
    color: text.primary,
    flex: 1,
  },
  detailDelete: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: `${semantic.error}10`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${semantic.error}25`,
  },
  detailContent: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    marginBottom: spacing.space24,
  },
  detailText: {
    ...typography.body,
    color: text.primary,
    lineHeight: 24,
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
});
