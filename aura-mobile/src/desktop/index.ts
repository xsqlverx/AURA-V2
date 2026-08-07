export { DesktopPresenceProvider, useDesktopPresence } from './DesktopPresenceContext';
export type { DesktopPresenceContextType, DesktopPresenceState } from './types';
export type {
  DesktopCapability,
  SystemStats,
  MediaInfo,
  FocusInfo,
  ClipboardInfo,
  ProcessInfo,
  AutomationInfo,
  DownloadInfo,
  NetworkInfo,
  BatteryInfo,
  HealthInfo,
  FileInfo,
} from './types';
export { DesktopPresenceSync } from './DesktopPresenceSync';
export type { SyncUpdate } from './DesktopPresenceSync';
export { getAllCapabilities, getCapabilityMeta, getRequiredCapabilities, getOptionalCapabilities } from './DesktopPresenceRegistry';
export {
  DesktopStatusBar,
  ConnectionIndicator,
  CpuIndicator,
  MemoryIndicator,
  DiskIndicator,
  MediaIndicator,
  FocusIndicator,
  UptimeIndicator,
  PresenceRow,
} from './DesktopPresenceIndicators';
