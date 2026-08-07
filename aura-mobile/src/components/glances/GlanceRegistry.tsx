import type { GlanceId } from './GlanceContext';

export type GlanceMeta = {
  id: GlanceId;
  icon: string;
  title: string;
  subtitle: string;
};

export const GLANCE_META: Record<GlanceId, GlanceMeta> = {
  desktop: { id: 'desktop', icon: 'monitor-heart', title: 'Desktop Status', subtitle: 'System health at a glance' },
  memory: { id: 'memory', icon: 'psychology', title: 'Memory', subtitle: 'Semantic knowledge store' },
  files: { id: 'files', icon: 'folder', title: 'Files', subtitle: 'Desktop file browser' },
  processes: { id: 'processes', icon: 'developer-board', title: 'Processes', subtitle: 'Running tasks' },
  notes: { id: 'notes', icon: 'edit-note', title: 'Notes', subtitle: 'Vault notes' },
  media: { id: 'media', icon: 'music-note', title: 'Media', subtitle: 'Now playing & volume' },
  activity: { id: 'activity', icon: 'newspaper', title: 'Recent Activity', subtitle: 'Latest events & headlines' },
  health: { id: 'health', icon: 'monitor-heart', title: 'System Health', subtitle: 'Detailed diagnostics' },
};

export const ALL_GLANCES = Object.values(GLANCE_META);
