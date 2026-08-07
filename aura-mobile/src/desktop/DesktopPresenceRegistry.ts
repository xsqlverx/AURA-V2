import type { DesktopCapability } from './types';

type CapabilityMeta = {
  id: DesktopCapability;
  label: string;
  pollInterval: number;
  required: boolean;
};

const CAPABILITY_REGISTRY: Record<DesktopCapability, CapabilityMeta> = {
  system_stats: { id: 'system_stats', label: 'System Stats', pollInterval: 10000, required: true },
  media: { id: 'media', label: 'Media Playback', pollInterval: 5000, required: false },
  focus: { id: 'focus', label: 'Focus App', pollInterval: 3000, required: false },
  clipboard: { id: 'clipboard', label: 'Clipboard', pollInterval: 2000, required: false },
  processes: { id: 'processes', label: 'Processes', pollInterval: 15000, required: false },
  automations: { id: 'automations', label: 'Automations', pollInterval: 5000, required: false },
  downloads: { id: 'downloads', label: 'Downloads', pollInterval: 5000, required: false },
  network: { id: 'network', label: 'Network', pollInterval: 15000, required: false },
  battery: { id: 'battery', label: 'Battery / UPS', pollInterval: 30000, required: false },
  gpu: { id: 'gpu', label: 'GPU Activity', pollInterval: 10000, required: false },
  health: { id: 'health', label: 'Backend Health', pollInterval: 10000, required: true },
  uptime: { id: 'uptime', label: 'Uptime', pollInterval: 30000, required: false },
  files: { id: 'files', label: 'Recent Files', pollInterval: 15000, required: false },
};

export function getCapabilityMeta(cap: DesktopCapability): CapabilityMeta {
  return CAPABILITY_REGISTRY[cap];
}

export function getPollIntervals(): Record<DesktopCapability, number> {
  const result = {} as Record<DesktopCapability, number>;
  for (const [key, meta] of Object.entries(CAPABILITY_REGISTRY)) {
    (result as any)[key] = meta.pollInterval;
  }
  return result;
}

export function getRequiredCapabilities(): DesktopCapability[] {
  return Object.values(CAPABILITY_REGISTRY)
    .filter((m) => m.required)
    .map((m) => m.id);
}

export function getOptionalCapabilities(): DesktopCapability[] {
  return Object.values(CAPABILITY_REGISTRY)
    .filter((m) => !m.required)
    .map((m) => m.id);
}

export function getAllCapabilities(): DesktopCapability[] {
  return Object.keys(CAPABILITY_REGISTRY) as DesktopCapability[];
}
