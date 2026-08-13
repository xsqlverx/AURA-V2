import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  SafeAreaView, Alert, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  systemLock, systemSleep, systemShutdown, systemRestart,
  getVolume, setVolume, muteAudio,
  getNowPlaying, mediaControl,
  launchApp,
  clipboardCopy, clipboardPaste,
  getWeather, getNews, triggerBriefing,
} from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassButton from '../../src/components/GlassButton';
import GlassInput from '../../src/components/GlassInput';
import Slider from '@react-native-community/slider';

function WeatherWidget({ data }: { data: any }) {
  if (!data) return null;
  const desc = typeof data === 'string' ? data : data.condition || data.description || data.weather || '';
  const temp = data.temp ?? '';
  return (
    <GlassCard glow="cyan">
      <View style={styles.weatherCard}>
        <View>
          <Text style={styles.weatherTemp}>{typeof temp === 'number' ? `${Math.round(temp)}°C` : temp}</Text>
          <Text style={styles.weatherDesc}>{desc}</Text>
        </View>
        <MaterialIcons name="wb-sunny" size={28} color={colors.warning} style={{ opacity: 0.6 }} />
      </View>
    </GlassCard>
  );
}

function BriefingButton() {
  const [loading, setLoading] = useState(false);
  const handleBriefing = async () => {
    setLoading(true);
    try {
      await triggerBriefing();
      Alert.alert('Briefing', 'Check the Chat tab for your briefing!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.briefingBtn, pressed && { opacity: 0.85 }]}
      onPress={handleBriefing}
      disabled={loading}
    >
      <View style={styles.briefingIconWrap}>
        <MaterialIcons name="campaign" size={20} color={colors.primary} />
      </View>
      <View style={styles.briefingText}>
        <Text style={styles.briefingTitle}>Daily Briefing</Text>
        <Text style={styles.briefingSub}>Full system status report</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <MaterialIcons name="arrow-forward-ios" size={14} color={colors.onSurfaceMuted} />
      )}
    </Pressable>
  );
}

function PowerButton({ icon, label, color, onPress, confirm }: {
  icon: string; label: string; color: string; onPress: () => Promise<void>; confirm?: string;
}) {
  const [loading, setLoading] = useState(false);
  const handlePress = async () => {
    if (confirm) {
      Alert.alert('Confirm', confirm, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: async () => {
          setLoading(true);
          try { await onPress(); } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setLoading(false); }
        }},
      ]);
    } else {
      setLoading(true);
      try { await onPress(); } catch (e: any) { Alert.alert('Error', e.message); }
      finally { setLoading(false); }
    }
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.powerBtn, { borderColor: color + '30' }, pressed && { opacity: 0.85 }]}
      onPress={handlePress}
      disabled={loading}
    >
      <View style={[styles.powerIconWrap, { backgroundColor: color + '12' }]}>
        {loading ? <ActivityIndicator color={color} size="small" /> : (
          <MaterialIcons name={icon as any} size={22} color={color} />
        )}
      </View>
      <Text style={[styles.powerLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function MuteButton() {
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    setLoading(true);
    try {
      await muteAudio(!muted);
      setMuted(!muted);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.muteBtn, pressed && { opacity: 0.85 }]}
      onPress={toggle}
      disabled={loading}
    >
      <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={18} color={colors.onSurfaceSecondary} />
      <Text style={styles.muteLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
    </Pressable>
  );
}

function VolumeControl() {
  const [vol, setVol] = useState<number | null>(null);
  const [displayVol, setDisplayVol] = useState(50);
  const [loading, setLoading] = useState(false);
  const lastCommitRef = useRef(0);
  const isCommittingRef = useRef(false);
  const loadVol = async () => {
    try {
      const res = await getVolume();
      if (res.volume !== undefined) { setVol(res.volume); setDisplayVol(res.volume); }
    } catch {}
  };
  useEffect(() => { loadVol(); }, []);

  const commitVolume = useCallback(async (value: number) => {
    if (isCommittingRef.current) return;
    const now = Date.now();
    if (now - lastCommitRef.current < 250) return;
    lastCommitRef.current = now;
    isCommittingRef.current = true;
    try {
      await setVolume(value);
      setVol(value);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { isCommittingRef.current = false; }
  }, []);

  const handleSlidingComplete = useCallback(async (value: number) => {
    if (vol === value) return;
    setLoading(true);
    try {
      await setVolume(value);
      setVol(value);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, [vol]);

  return (
    <GlassCard>
      <View style={styles.volHeader}>
        <View style={styles.volLeft}>
          <MaterialIcons name="volume-up" size={18} color={colors.primary} />
          <Text style={styles.volLabel}>Volume</Text>
        </View>
        <Text style={styles.volValue}>{displayVol}%</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={displayVol}
        onValueChange={(v) => {
          setDisplayVol(v);
          commitVolume(v);
        }}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor="rgba(255,255,255,0.1)"
        thumbTintColor={colors.primary}
        disabled={loading}
      />
      <View style={styles.volFooter}>
        <Text style={styles.volMin}>0</Text>
        <MuteButton />
        <Text style={styles.volMax}>100</Text>
      </View>
    </GlassCard>
  );
}

function NowPlaying() {
  const [track, setTrack] = useState<any>(null);
  const [error, setError] = useState(false);
  const load = async () => {
    try {
      const data = await getNowPlaying();
      if (data.title && data.title !== 'Unknown') {
        setTrack(data);
        setError(false);
      } else {
        setTrack(null);
      }
    } catch { setError(true); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => {
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  if (!track && error) return null;
  if (!track) return null;

  const send = async (action: string) => {
    try { await mediaControl(action); } catch {}
  };

  return (
    <GlassCard glow="purple">
      <View style={styles.npHeader}>
        <View style={styles.npIconWrap}>
          <MaterialIcons name="music-note" size={18} color={colors.secondary} />
        </View>
        <View style={styles.npInfo}>
          <Text style={styles.npTitle} numberOfLines={1}>{track.title || 'Unknown'}</Text>
          {track.artist && <Text style={styles.npArtist} numberOfLines={1}>{track.artist}</Text>}
          {track.source_app && <Text style={styles.npSource}>{track.source_app}</Text>}
        </View>
        <View style={styles.npIndicator}>
          <View style={[styles.npDot, track.is_playing && { backgroundColor: colors.tertiary }]} />
        </View>
      </View>
      <View style={styles.npControls}>
        <Pressable style={styles.npBtn} onPress={() => send('prev')}>
          <MaterialIcons name="skip-previous" size={22} color={colors.onSurfaceSecondary} />
        </Pressable>
        <Pressable style={[styles.npBtn, styles.npPlayBtn]} onPress={() => send('play_pause')}>
          <MaterialIcons name={track.is_playing ? 'pause' : 'play-arrow'} size={24} color={colors.onSurface} />
        </Pressable>
        <Pressable style={styles.npBtn} onPress={() => send('next')}>
          <MaterialIcons name="skip-next" size={22} color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

const APPS = [
  { name: 'Spotify',   app: 'spotify',       icon: 'music-note', color: colors.tertiary },
  { name: 'Chrome',    app: 'chrome',        icon: 'language', color: colors.primary },
  { name: 'VS Code',   app: 'vscode',        icon: 'code', color: '#388BFD' },
  { name: 'Discord',   app: 'discord',       icon: 'chat', color: colors.secondary },
  { name: 'Terminal',  app: 'terminal',      icon: 'terminal', color: colors.onSurfaceSecondary },
  { name: 'Notepad',   app: 'notepad',       icon: 'edit', color: colors.warning },
  { name: 'Explorer',  app: 'file explorer', icon: 'folder', color: '#2DD4A8' },
  { name: 'Steam',     app: 'steam',         icon: 'sports-esports', color: colors.secondary },
];

function QuickLaunch() {
  const [launching, setLaunching] = useState<string | null>(null);
  const handleLaunch = async (app: string) => {
    setLaunching(app);
    try {
      const res = await launchApp(app);
      if (res.error) Alert.alert('Error', res.error);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLaunching(null); }
  };
  return (
    <View style={styles.appGrid}>
      {APPS.map((app) => (
        <Pressable
          key={app.app}
          style={({ pressed }) => [styles.appBtn, pressed && { opacity: 0.85 }]}
          onPress={() => handleLaunch(app.app)}
          disabled={launching === app.app}
        >
          <View style={[styles.appIconWrap, { backgroundColor: app.color + '12' }]}>
            {launching === app.app ? (
              <ActivityIndicator color={app.color} size="small" />
            ) : (
              <MaterialIcons name={app.icon as any} size={20} color={app.color} />
            )}
          </View>
          <Text style={styles.appName}>{app.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ClipboardSection() {
  const [text, setText] = useState('');
  const [pcClip, setPcClip] = useState('');
  const [copying, setCopying] = useState(false);
  const [pasting, setPasting] = useState(false);

  const handleCopy = async () => {
    if (!text.trim()) return;
    setCopying(true);
    try {
      await clipboardCopy(text);
      Alert.alert('Copied', 'Text sent to PC clipboard');
      setText('');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCopying(false); }
  };

  const handlePaste = async () => {
    setPasting(true);
    try {
      const res = await clipboardPaste();
      if (res.text) setPcClip(res.text);
      else Alert.alert('Empty', 'PC clipboard is empty');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setPasting(false); }
  };

  return (
    <GlassCard>
      <GlassInput
        style={styles.clipInput}
        value={text}
        onChangeText={setText}
        placeholder="Text to copy to PC..."
        multiline
      />
      <View style={styles.clipBtns}>
        <GlassButton variant="primary" onPress={handleCopy} disabled={copying || !text.trim()}>
          {copying ? '...' : 'Copy to PC'}
        </GlassButton>
        <GlassButton variant="secondary" onPress={handlePaste} disabled={pasting}>
          {pasting ? '...' : 'Read PC'}
        </GlassButton>
      </View>
      {pcClip ? (
        <View style={styles.clipResult}>
          <Text style={styles.clipResultLabel}>PC Clipboard</Text>
          <Text style={styles.clipResultText} numberOfLines={3}>{pcClip}</Text>
          <GlassButton variant="secondary" onPress={async () => {
            await Clipboard.setStringAsync(pcClip);
            Alert.alert('Copied', 'PC clipboard text copied to phone');
          }}>
            Copy to Phone
          </GlassButton>
        </View>
      ) : null}
    </GlassCard>
  );
}

function NewsSection() {
  const [headlines, setHeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const data = await getNews(3);
      if (Array.isArray(data)) setHeadlines(data);
      else if (data.error) setHeadlines([]);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (headlines.length === 0) return null;

  const openHeadline = (h: any) => {
    if (h.url) {
      WebBrowser.openBrowserAsync(h.url).catch(() => {});
    } else {
      Alert.alert('News', h.title);
    }
  };

  return (
    <View style={styles.newsSection}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="newspaper" size={16} color={colors.onSurfaceMuted} />
        <Text style={styles.sectionLabel}>HEADLINES</Text>
      </View>
      {headlines.map((h, i) => (
        <Pressable key={i} onPress={() => openHeadline(h)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <GlassCard>
            <Text style={styles.newsTitle} numberOfLines={2}>{h.title}</Text>
            <Text style={styles.newsSource}>{h.source}</Text>
          </GlassCard>
        </Pressable>
      ))}
    </View>
  );
}

export default function ActionsScreen() {
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProp<{}>>();
  const [weather, setWeather] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadWeather = async () => {
    try {
      const data = await getWeather();
      setWeather(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    loadWeather();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWeather()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <MaterialIcons name="menu" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerLeft}>
          <MaterialIcons name="bolt" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Actions</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/notes')} style={styles.headerLinkBtn}>
          <MaterialIcons name="edit-note" size={16} color={colors.primary} />
          <Text style={styles.headerLink}>Notes</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <WeatherWidget data={weather} />
        <BriefingButton />

        <View style={styles.sectionHeader}>
          <MaterialIcons name="power-settings-new" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.sectionLabel}>SYSTEM</Text>
        </View>
        <View style={styles.powerGrid}>
          <PowerButton icon="lock" label="Lock" color={colors.primary} onPress={systemLock} />
          <PowerButton icon="bedtime" label="Sleep" color={colors.secondary} onPress={systemSleep} />
          <PowerButton icon="restart-alt" label="Restart" color={colors.warning} onPress={systemRestart} confirm="Restart your PC?" />
          <PowerButton icon="power-settings-new" label="Shutdown" color={colors.error} onPress={systemShutdown} confirm="Shut down your PC?" />
        </View>

        <View style={styles.sectionHeader}>
          <MaterialIcons name="volume-up" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.sectionLabel}>AUDIO</Text>
        </View>
        <VolumeControl />
        <NowPlaying />

        <View style={styles.sectionHeader}>
          <MaterialIcons name="grid-view" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.sectionLabel}>QUICK LAUNCH</Text>
        </View>
        <QuickLaunch />

        <View style={styles.sectionHeader}>
          <MaterialIcons name="content-paste" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.sectionLabel}>CLIPBOARD</Text>
        </View>
        <ClipboardSection />

        <NewsSection />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 28,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.input,
    backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  headerLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  weatherCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  weatherTemp: { ...typography.displayLg, fontSize: 28, color: colors.onSurface },
  weatherDesc: { color: colors.onSurface, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  briefingBtn: {
    backgroundColor: colors.glassBg, borderRadius: radius.card, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  briefingIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,242,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  briefingText: { flex: 1 },
  briefingTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 14 },
  briefingSub: { color: colors.onSurface, fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sectionLabel: { ...typography.labelMd, color: colors.primary },
  powerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  powerBtn: {
    width: '47%', aspectRatio: 1.6,
    backgroundColor: colors.glassBg, borderRadius: radius.card,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1,
  },
  powerIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  powerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  volHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  volLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  volLabel: { color: colors.onSurface, fontSize: 13, fontWeight: '600' },
  volValue: { ...typography.displayLg, fontSize: 22, color: colors.primary },
  volMin: { color: colors.onSurface, fontSize: 11 },
  volMax: { color: colors.onSurface, fontSize: 11 },
  volFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.glassBg, borderRadius: spacing.sm, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.glassBorder },
  muteLabel: { color: colors.onSurface, fontSize: 11, fontWeight: '600' },
  npHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  npIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(188,140,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  npInfo: { flex: 1 },
  npTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  npArtist: { color: colors.onSurface, fontSize: 12, marginTop: 2 },
  npSource: { color: colors.onSurface, fontSize: 10, marginTop: 2 },
  npIndicator: {},
  npDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onSurfaceMuted },
  npControls: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: spacing.sm },
  npBtn: { padding: spacing.sm, borderRadius: 20 },
  npPlayBtn: { backgroundColor: colors.glassBg, borderRadius: 24, padding: spacing.md },
  appGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  appBtn: {
    width: '22%', aspectRatio: 1,
    backgroundColor: colors.glassBg, borderRadius: radius.card,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  appIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appName: { color: colors.onSurface, fontSize: 10, fontWeight: '600' },
  clipInput: { minHeight: 56, textAlignVertical: 'top' },
  clipBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  clipResult: { backgroundColor: colors.glassBg, borderRadius: 10, padding: spacing.md, gap: spacing.xs, marginTop: spacing.sm },
  clipResultLabel: { ...typography.labelMd, color: colors.primary, fontSize: 10 },
  clipResultText: { color: colors.onSurface, fontSize: 12, lineHeight: 18 },
  newsSection: { gap: 10 },
  newsTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '500' },
  newsSource: { color: colors.onSurface, fontSize: 10, fontWeight: '600', marginTop: spacing.xs },
});
