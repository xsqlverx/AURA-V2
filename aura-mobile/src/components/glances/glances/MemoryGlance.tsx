import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { getMemory, deleteMemory, createMemory, updateMemory } from '../../../api/aura';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

type MemoryEntry = {
  id: string;
  text: string;
  metadata?: {
    type?: string;
    created_at?: string;
    confidence?: number;
    tags?: string[];
  };
};

export default function MemoryGlance() {
  const { updateGlanceData } = useGlance();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    getMemory().then((d) => {
      setEntries(d);
      updateGlanceData('memory', d);
    }).catch(() => {});
  }, []);

  const filtered = search
    ? entries.filter((e) =>
        e.text.toLowerCase().includes(search.toLowerCase()) ||
        (e.metadata?.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : entries;

  const handleDelete = async (id: string) => {
    haptic.press();
    try {
      await deleteMemory(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    haptic.press();
    try {
      await updateMemory(id, editText.trim());
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, text: editText.trim() } : e));
      setEditingId(null);
      setEditText('');
    } catch {}
  };

  const startEdit = (entry: MemoryEntry) => {
    haptic.press();
    setEditingId(entry.id);
    setEditText(entry.text);
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    haptic.press();
    setExpandedId((prev) => prev === id ? null : id);
    setEditingId(null);
  };

  const getConfidenceColor = (c?: number): string => {
    if (c == null) return text.tertiary;
    if (c >= 0.8) return semantic.success;
    if (c >= 0.5) return semantic.warning;
    return semantic.error;
  };

  return (
    <View style={styles.container}>
      <GlanceHeader icon="psychology" title="Memory" subtitle={`${entries.length} entries`} />

      <View style={styles.searchRow}>
        <Icon name="search" size={14} color={text.tertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search memories..."
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
            <Icon name="psychology" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>
              {search ? `No memories matching "${search}"` : 'No memories yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((entry, i) => {
              const isExpanded = expandedId === entry.id;
              const isEditing = editingId === entry.id;
              const meta = entry.metadata || {};
              const tags = meta.tags || [];
              return (
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 25, 400))}
                >
                  <View style={styles.card}>
                    <Pressable onPress={() => toggleExpand(entry.id)} style={styles.cardMain}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardLeft}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{meta.type || 'memory'}</Text>
                          </View>
                          {meta.confidence != null && (
                            <View style={[styles.confBadge, { backgroundColor: `${getConfidenceColor(meta.confidence)}15` }]}>
                              <Text style={[styles.confText, { color: getConfidenceColor(meta.confidence) }]}>
                                {(meta.confidence * 100).toFixed(0)}%
                              </Text>
                            </View>
                          )}
                        </View>
                        <Icon
                          name={isExpanded ? 'expand-less' : 'expand-more'}
                          size={18}
                          color={text.tertiary}
                        />
                      </View>

                      {isEditing ? (
                        <View style={styles.editArea}>
                          <TextInput
                            style={styles.editInput}
                            value={editText}
                            onChangeText={setEditText}
                            multiline
                            autoFocus
                          />
                          <View style={styles.editActions}>
                            <Pressable onPress={() => { setEditingId(null); setEditText(''); }} style={styles.editCancel}>
                              <Text style={styles.editCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={() => handleSaveEdit(entry.id)} style={styles.editSave}>
                              <Text style={styles.editSaveText}>Save</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.text} numberOfLines={isExpanded ? undefined : 2}>
                          {entry.text}
                        </Text>
                      )}

                      {meta.created_at && !isEditing && (
                        <Text style={styles.created}>{meta.created_at}</Text>
                      )}

                      {tags.length > 0 && !isEditing && (
                        <View style={styles.tagsRow}>
                          {tags.slice(0, 4).map((tag) => (
                            <View key={tag} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                          {tags.length > 4 && (
                            <Text style={styles.tagMore}>+{tags.length - 4}</Text>
                          )}
                        </View>
                      )}
                    </Pressable>

                    {isExpanded && !isEditing && (
                      <View style={styles.cardActions}>
                        <Pressable onPress={() => startEdit(entry)} style={styles.actionBtn}>
                          <Icon name="edit" size={14} color={accent.cyan} />
                          <Text style={styles.actionText}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDelete(entry.id)} style={[styles.actionBtn, styles.actionDanger]}>
                          <Icon name="trash" size={14} color={semantic.error} />
                          <Text style={[styles.actionText, { color: semantic.error }]}>Delete</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
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
  card: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${accent.purple}25`,
    borderLeftWidth: 3,
    borderLeftColor: accent.purple,
    overflow: 'hidden',
  },
  cardMain: {
    padding: spacing.space12,
    gap: spacing.space8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  typeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
    backgroundColor: `${accent.purple}12`,
  },
  typeText: {
    ...typography.caption,
    fontSize: 9,
    color: accent.purple,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
  },
  confText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  text: {
    ...typography.bodySmall,
    color: text.primary,
    lineHeight: 20,
  },
  created: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space4,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
    backgroundColor: `${accent.purple}08`,
  },
  tagText: {
    ...typography.caption,
    fontSize: 9,
    color: accent.purple,
  },
  tagMore: {
    ...typography.caption,
    fontSize: 9,
    color: text.tertiary,
    paddingVertical: 2,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: glass.border,
    padding: spacing.space8,
    gap: spacing.space8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: `${accent.cyan}08`,
  },
  actionDanger: {
    backgroundColor: `${semantic.error}08`,
  },
  actionText: {
    ...typography.caption,
    color: accent.cyan,
    fontWeight: '600',
  },
  editArea: {
    gap: spacing.space8,
  },
  editInput: {
    ...typography.bodySmall,
    color: text.primary,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: accent.cyan,
    padding: spacing.space8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.space8,
  },
  editCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editCancelText: {
    ...typography.caption,
    color: text.secondary,
  },
  editSave: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: accent.cyan,
  },
  editSaveText: {
    ...typography.caption,
    color: '#050505',
    fontWeight: '700',
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
