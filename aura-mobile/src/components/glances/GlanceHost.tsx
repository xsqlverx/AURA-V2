import { useGlance } from './GlanceContext';
import GlanceSheet from './GlanceSheet';
import { DesktopGlance, MemoryGlance, FilesGlance, ProcessesGlance, NotesGlance, MediaGlance, ActivityGlance, HealthGlance } from './glances';

const GLANCE_MAP: Record<string, { component: React.ComponentType<any> }> = {
  desktop: { component: DesktopGlance },
  memory: { component: MemoryGlance },
  files: { component: FilesGlance },
  processes: { component: ProcessesGlance },
  notes: { component: NotesGlance },
  media: { component: MediaGlance },
  activity: { component: ActivityGlance },
  health: { component: HealthGlance },
};

export default function GlanceHost() {
  const { activeGlance } = useGlance();

  if (!activeGlance) return null;

  const entry = GLANCE_MAP[activeGlance];
  if (!entry) return null;

  const Component = entry.component;

  return (
    <GlanceSheet>
      <Component />
    </GlanceSheet>
  );
}
