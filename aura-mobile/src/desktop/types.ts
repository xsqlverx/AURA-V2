export type DesktopCapability =
  | 'system_stats'
  | 'media'
  | 'focus'
  | 'clipboard'
  | 'processes'
  | 'automations'
  | 'downloads'
  | 'network'
  | 'battery'
  | 'gpu'
  | 'health'
  | 'uptime'
  | 'files';

export type SystemStats = {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  gpu_percent?: number;
  gpu_temp?: number;
};

export type MediaInfo = {
  title: string;
  artist?: string;
  app?: string;
  is_playing: boolean;
};

export type FocusInfo = {
  app: string;
  window_title: string;
};

export type ClipboardInfo = {
  text: string;
  timestamp: number;
};

export type ProcessInfo = {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
};

export type AutomationInfo = {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  started_at: number;
};

export type DownloadInfo = {
  id: string;
  name: string;
  progress: number;
  speed?: string;
  eta?: string;
};

export type NetworkInfo = {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency_ms: number;
  ssid?: string;
};

export type BatteryInfo = {
  percent: number;
  charging: boolean;
  time_remaining?: string;
};

export type HealthInfo = {
  backend: 'healthy' | 'degraded' | 'down';
  uptime_seconds: number;
  version?: string;
  last_seen: number;
};

export type FileInfo = {
  path: string;
  name: string;
  size_bytes: number;
  modified_at: number;
};

export type DesktopPresenceState = {
  capabilities: DesktopCapability[];
  system?: SystemStats;
  media?: MediaInfo;
  focus?: FocusInfo;
  clipboard?: ClipboardInfo;
  processes: ProcessInfo[];
  automations: AutomationInfo[];
  downloads: DownloadInfo[];
  network?: NetworkInfo;
  battery?: BatteryInfo;
  health: HealthInfo;
  recentFiles: FileInfo[];
  lastUpdated: number;
  syncStatus: 'syncing' | 'synced' | 'stale' | 'error';
};

export type DesktopPresenceContextType = {
  state: DesktopPresenceState;
  refresh: () => Promise<void>;
  hasCapability: (cap: DesktopCapability) => boolean;
};
