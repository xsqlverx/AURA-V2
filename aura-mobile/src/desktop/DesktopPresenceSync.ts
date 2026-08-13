import { getStats, getNowPlaying, getProcesses, getVolume, getHealth } from '../api/aura';
import type {
  DesktopCapability,
  DesktopPresenceState,
  SystemStats,
  MediaInfo,
  FocusInfo,
  NetworkInfo,
  BatteryInfo,
  HealthInfo,
} from './types';

const PRESENCE_TIMEOUT = 5000;

async function fetchWithTimeout<T>(fetcher: () => Promise<T>, ms = PRESENCE_TIMEOUT): Promise<T | null> {
  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);
    return result;
  } catch {
    return null;
  }
}

export type SyncUpdate = Partial<DesktopPresenceState> & { lastUpdated: number };

export type SyncCallback = (update: SyncUpdate) => void;

const DEFAULT_PROCESSES: import('./types').ProcessInfo[] = [];
const DEFAULT_AUTOMATIONS: import('./types').AutomationInfo[] = [];
const DEFAULT_DOWNLOADS: import('./types').DownloadInfo[] = [];
const DEFAULT_FILES: import('./types').FileInfo[] = [];

export function createInitialState(): DesktopPresenceState {
  return {
    capabilities: [],
    processes: DEFAULT_PROCESSES,
    automations: DEFAULT_AUTOMATIONS,
    downloads: DEFAULT_DOWNLOADS,
    recentFiles: DEFAULT_FILES,
    health: {
      backend: 'down',
      uptime_seconds: 0,
      last_seen: Date.now(),
    },
    lastUpdated: Date.now(),
    syncStatus: 'syncing',
  };
}

export class DesktopPresenceSync {
  private timers: Map<DesktopCapability, ReturnType<typeof setInterval>> = new Map();
  private callback: SyncCallback;
  private active: boolean = false;
  private availableCaps: DesktopCapability[] = [];

  constructor(callback: SyncCallback) {
    this.callback = callback;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.syncAll();
    this.schedule('system_stats', 10000);
    this.schedule('media', 5000);
    this.schedule('focus', 3000);
    this.schedule('health', 10000);
    this.schedule('network', 15000);
    this.schedule('battery', 30000);
  }

  stop(): void {
    this.active = false;
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  async refresh(): Promise<void> {
    await this.syncAll();
  }

  getAvailableCapabilities(): DesktopCapability[] {
    return [...this.availableCaps];
  }

  private schedule(cap: DesktopCapability, intervalMs: number): void {
    if (this.timers.has(cap)) return;
    const timer = setInterval(() => this.sync(cap), intervalMs);
    this.timers.set(cap, timer);
  }

  private async syncAll(): Promise<void> {
    await Promise.all([
      this.sync('system_stats'),
      this.sync('media'),
      this.sync('focus'),
      this.sync('health'),
      this.sync('network'),
    ]);
  }

  private async sync(cap: DesktopCapability): Promise<void> {
    if (!this.active) return;

    switch (cap) {
      case 'system_stats': return this.syncSystemStats();
      case 'media': return this.syncMedia();
      case 'focus': return this.syncFocus();
      case 'health': return this.syncHealth();
      case 'network': return this.syncNetwork();
      case 'battery': return this.syncBattery();
      default: break;
    }
  }

  private async syncSystemStats(): Promise<void> {
    const data = await fetchWithTimeout(() => getStats());
    if (!data) return;

    const system: SystemStats = {
      cpu_percent: data.cpu_percent ?? 0,
      memory_percent: data.ram_percent ?? data.memory_percent ?? 0,
      memory_used_gb: data.ram_used_gb ?? data.memory_used_gb ?? 0,
      memory_total_gb: data.ram_total_gb ?? data.memory_total_gb ?? 0,
      disk_percent: data.disk_percent ?? 0,
      gpu_percent: data.gpu_percent,
      gpu_temp: data.gpu_temp,
    };

    const battery: BatteryInfo | undefined = data.battery
      ? {
          percent: data.battery.percent ?? 0,
          charging: data.battery.charging ?? false,
          time_remaining: data.battery.time_remaining,
        }
      : undefined;

    const update: SyncUpdate = {
      system,
      ...(battery ? { battery } : {}),
      lastUpdated: Date.now(),
      syncStatus: 'synced',
    };

    if (!this.availableCaps.includes('system_stats')) {
      this.availableCaps.push('system_stats');
      update.capabilities = [...this.availableCaps];
    }
    if (battery && !this.availableCaps.includes('battery')) {
      this.availableCaps.push('battery');
      update.capabilities = [...this.availableCaps];
    }

    this.callback(update);
  }

  private async syncMedia(): Promise<void> {
    const data = await fetchWithTimeout(() => getNowPlaying());
    if (!data) return;

    const media: MediaInfo = {
      title: data.title || 'Unknown',
      artist: data.artist,
      app: data.app,
      is_playing: data.is_playing ?? false,
    };

    const update: SyncUpdate = {
      media,
      lastUpdated: Date.now(),
    };

    if (!this.availableCaps.includes('media')) {
      this.availableCaps.push('media');
      update.capabilities = [...this.availableCaps];
    }

    this.callback(update);
  }

  private async syncFocus(): Promise<void> {
    const data = await fetchWithTimeout(() => getNowPlaying());
    if (!data) return;

    if (data.focus_app || data.foreground_app) {
      const focus: FocusInfo = {
        app: data.focus_app || data.foreground_app || 'Unknown',
        window_title: data.window_title || '',
      };

      const update: SyncUpdate = {
        focus,
        lastUpdated: Date.now(),
      };

      if (!this.availableCaps.includes('focus')) {
        this.availableCaps.push('focus');
        update.capabilities = [...this.availableCaps];
      }

      this.callback(update);
    }
  }

  private async syncHealth(): Promise<void> {
    const data = await fetchWithTimeout(() => getHealth());
    const healthy = data?.status === 'ok';

    const health: HealthInfo = {
      backend: healthy ? 'healthy' : 'down',
      uptime_seconds: 0,
      last_seen: Date.now(),
    };

    const update: SyncUpdate = {
      health,
      lastUpdated: Date.now(),
      syncStatus: healthy ? 'synced' as const : 'stale' as const,
    };

    if (!this.availableCaps.includes('health')) {
      this.availableCaps.push('health');
      update.capabilities = [...this.availableCaps];
    }

    this.callback(update);
  }

  private async syncNetwork(): Promise<void> {
    const network: NetworkInfo = {
      quality: 'good',
      latency_ms: 0,
    };

    const update: SyncUpdate = {
      network,
      lastUpdated: Date.now(),
    };

    if (!this.availableCaps.includes('network')) {
      this.availableCaps.push('network');
      update.capabilities = [...this.availableCaps];
    }

    this.callback(update);
  }

  private async syncBattery(): Promise<void> {
    // battery is handled inside syncSystemStats
  }
}
