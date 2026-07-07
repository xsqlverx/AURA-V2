import * as Lucide from 'lucide-react-native';
import { View } from 'react-native';

const MAP: Record<string, keyof typeof Lucide> = {
  home: 'Home',
  'chat-bubble-outline': 'MessageCircle',
  bolt: 'Zap',
  psychology: 'BrainCircuit',
  'monitor-heart': 'Activity',
  'edit-note': 'StickyNote',
  'developer-board': 'Cpu',
  settings: 'Settings',
  memory: 'Cpu',
  storage: 'HardDrive',
  'battery-full': 'BatteryFull',
  'wb-sunny': 'Sun',
  'arrow-upward': 'ArrowUp',
  mic: 'Mic',
  stop: 'Square',
  campaign: 'Megaphone',
  'arrow-forward-ios': 'ChevronRight',
  lock: 'Lock',
  bedtime: 'Moon',
  'restart-alt': 'RefreshCw',
  'power-settings-new': 'Power',
  'volume-up': 'Volume2',
  'music-note': 'Music',
  'skip-previous': 'SkipBack',
  'play-arrow': 'Play',
  pause: 'Pause',
  'skip-next': 'SkipForward',
  code: 'Code',
  edit: 'Pencil',
  terminal: 'Terminal',
  folder: 'Folder',
  'sports-esports': 'Gamepad2',
  'content-copy': 'Copy',
  'content-paste': 'ClipboardPaste',
  newspaper: 'Newspaper',
  search: 'Search',
  'settings-ethernet': 'EthernetPort',
  'error-outline': 'AlertCircle',
  'check-circle': 'CheckCircle',
  'info-outline': 'Info',
  'hourglass-empty': 'Hourglass',
  schedule: 'Clock',
  'hard-drive': 'HardDrive',
  description: 'FileText',
  'chevron-right': 'ChevronRight',
  'arrow-back': 'ArrowLeft',
  add: 'Plus',
  'add-circle': 'PlusCircle',
  close: 'X',
  check: 'Check',
  'wifi-find': 'Wifi',
  save: 'Save',
  dns: 'Globe',
  key: 'KeyRound',
  menu: 'Menu',
};

type Props = {
  name: string;
  size?: number;
  color?: string;
};

export default function Icon({ name, size = 20, color = '#fff' }: Props) {
  const lucideName = MAP[name];
  if (!lucideName) {
    const FallbackIcon = Lucide['Circle'] as any;
    return <FallbackIcon size={size} color={color} />;
  }
  const LucideIcon = Lucide[lucideName] as any;
  if (!LucideIcon) {
    const FallbackIcon = Lucide['Circle'] as any;
    return <FallbackIcon size={size} color={color} />;
  }
  return <LucideIcon size={size} color={color} />;
}
