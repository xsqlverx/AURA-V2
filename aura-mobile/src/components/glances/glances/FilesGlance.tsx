import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { fileList, fileOpen } from '../../../api/aura';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration } from '../../../tokens/animation';

type FileEntry = {
  name: string;
  path?: string;
  is_dir: boolean;
  size_bytes?: number;
  modified_at?: number;
};

function formatSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getFileIcon(name: string | undefined, isDir: boolean): string {
  if (isDir) return 'folder';
  if (!name) return 'description';
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return 'description';
  const map: Record<string, string> = {
    js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code',
    json: 'code', html: 'code', css: 'code', md: 'description',
    txt: 'description', pdf: 'picture-as-pdf', zip: 'folder-zip',
    rar: 'folder-zip', gz: 'folder-zip', png: 'image', jpg: 'image',
    jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
    mp3: 'music-note', wav: 'music-note', flac: 'music-note',
    mp4: 'video-file', mkv: 'video-file', avi: 'video-file',
    doc: 'description', docx: 'description', xls: 'grid-view',
    xlsx: 'grid-view', ppt: 'presentation', pptx: 'presentation',
    exe: 'application', dll: 'application', dmg: 'application',
  };
  return map[ext] || 'description';
}

function getFileColor(name: string | undefined, isDir: boolean): string {
  if (isDir) return accent.cyan;
  if (!name) return text.secondary;
  const ext = name.split('.').pop()?.toLowerCase();
  const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'json', 'html', 'css'];
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
  const audioExts = ['mp3', 'wav', 'flac'];
  const videoExts = ['mp4', 'mkv', 'avi'];
  if (codeExts.includes(ext || '')) return '#6C9FFF';
  if (imgExts.includes(ext || '')) return '#FF6B9D';
  if (audioExts.includes(ext || '')) return accent.cyan;
  if (videoExts.includes(ext || '')) return '#FF9F0A';
  return text.secondary;
}

export default function FilesGlance() {
  const { updateGlanceData } = useGlance();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [pathHistory, setPathHistory] = useState<string[]>(['.']);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const d = await fileList(path);
      const list = d.files || d.entries || [];
      setFiles(list);
      updateGlanceData('files', list);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [updateGlanceData]);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const dirs = files.filter((f) => f.is_dir);
  const fileItems = files.filter((f) => !f.is_dir);
  const sorted = [...dirs, ...fileItems];

  const filtered = search
    ? sorted.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const handleOpen = async (entry: FileEntry) => {
    haptic.press();
    if (entry.is_dir) {
      setPathHistory((prev) => [...prev, entry.name]);
      setCurrentPath(entry.name);
      setSearch('');
    } else {
      try {
        await fileOpen(entry.path || entry.name);
      } catch {}
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    haptic.press();
    const path = pathHistory[index];
    setPathHistory((prev) => prev.slice(0, index + 1));
    setCurrentPath(path);
    setSearch('');
  };

  const getBreadcrumbs = () => {
    const crumbs: { label: string; index: number }[] = [];
    pathHistory.forEach((p, i) => {
      crumbs.push({ label: i === 0 ? 'Root' : p, index: i });
    });
    return crumbs;
  };

  return (
    <View style={styles.container}>
      <GlanceHeader icon="folder" title="Files" subtitle={`${files.length} items`} />

      <View style={styles.searchRow}>
        <Icon name="search" size={14} color={text.tertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search files..."
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
        <View style={styles.breadcrumbs}>
          {getBreadcrumbs().map((crumb, i) => (
            <View key={crumb.index} style={styles.crumbRow}>
              {i > 0 && <Icon name="chevron-right" size={12} color={text.tertiary} />}
              <Pressable
                onPress={() => navigateToBreadcrumb(crumb.index)}
                style={[styles.crumb, i === pathHistory.length - 1 && styles.crumbActive]}
              >
                <Text
                  style={[styles.crumbText, i === pathHistory.length - 1 && styles.crumbTextActive]}
                  numberOfLines={1}
                >
                  {crumb.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="folder" size={28} color={text.tertiary} />
            <Text style={styles.emptyText}>
              {search ? `No files matching "${search}"` : 'This folder is empty'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((entry, i) => (
              <Animated.View
                key={`${currentPath}-${entry.name}`}
                entering={FadeInDown.duration(duration.fast).delay(Math.min(i * 20, 300))}
              >
                <Pressable
                  onPress={() => handleOpen(entry)}
                  style={({ pressed }) => [styles.fileRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.fileIcon, { backgroundColor: `${getFileColor(entry.name, entry.is_dir)}15` }]}>
                    <Icon name={getFileIcon(entry.name, entry.is_dir)} size={18} color={getFileColor(entry.name, entry.is_dir)} />
                  </View>
                  <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>{entry.name || 'Unknown'}</Text>
                    <View style={styles.fileMeta}>
                      {!entry.is_dir && entry.size_bytes != null && (
                        <Text style={styles.metaText}>{formatSize(entry.size_bytes)}</Text>
                      )}
                      {entry.modified_at ? (
                        <>
                          {!entry.is_dir && entry.size_bytes != null && (
                            <Text style={styles.metaDivider}>·</Text>
                          )}
                          <Text style={styles.metaText}>{formatDate(entry.modified_at)}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.fileRight}>
                    {entry.is_dir && (
                      <View style={styles.dirBadge}>
                        <Text style={styles.dirBadgeText}>DIR</Text>
                      </View>
                    )}
                    <Icon name="chevron-right" size={14} color={text.tertiary} />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
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
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.space4,
    paddingVertical: spacing.space8,
  },
  crumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  crumb: {
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space8,
    borderRadius: radius.sm,
  },
  crumbActive: {
    backgroundColor: `${accent.cyan}12`,
  },
  crumbText: {
    ...typography.caption,
    color: text.secondary,
  },
  crumbTextActive: {
    color: accent.cyan,
    fontWeight: '600',
  },
  list: {
    paddingTop: spacing.space4,
    gap: spacing.space4,
    paddingBottom: spacing.space24,
  },
  fileRow: {
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
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '500',
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  metaText: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  metaDivider: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
  fileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  dirBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm - 2,
    backgroundColor: `${accent.cyan}12`,
  },
  dirBadgeText: {
    ...typography.caption,
    fontSize: 9,
    color: accent.cyan,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.space32,
    gap: spacing.space8,
  },
  emptyText: {
    ...typography.bodySmall,
    color: text.tertiary,
  },
});
