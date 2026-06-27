import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  SafeAreaView, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  systemLock, systemSleep, systemShutdown, systemRestart,
  getVolume, setVolume, muteAudio,
  getNowPlaying, mediaControl,
  launchApp,
  clipboardCopy, clipboardPaste,
  getWeather, getNews, triggerBriefing,
} from '../../src/api/aura';
import { colors } from '../../src/theme';

// ── Weather ─────────────────────────────────────────────────────────

function WeatherWidget({ data }: { data: any }) {
  if (!data) return null;
  const desc = typeof data === 'string' ? data : data.description || data.weather || '';
  const temp = data.temp ?? '';
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(0)} style={styles.weatherCard}>
      <Text style={styles.weatherTemp}>{typeof temp === 'number' ? `${Math.round(temp)}°C` : temp}</Text>
      <Text style={styles.weatherDesc}>{desc}</Text>
    </Animated.View>
  );
}

// ── Briefing Button ──────────────────────────────────────────────────

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
      style={({ pressed }) => [styles.briefingBtn, pressed && { opacity: 0.8 }]}
      onPress={handleBriefing}
      disabled={loading}
    >
      <Text style={styles.briefingIcon}>📋</Text>
      <View style={styles.briefingText}>
        <Text style={styles.briefingTitle}>Daily Briefing</Text>
        <Text style={styles.briefingSub}>Get your full status report</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accentCyan} size="small" />
      ) : (
        <Text style={styles.briefingArrow}>→</Text>
      )}
    </Pressable>
  );
}

// ── Power Action Button ──────────────────────────────────────────────

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
      style={({ pressed }) => [styles.powerBtn, { borderColor: color + '40' }, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.powerIcon]}>{icon}</Text>}
      <Text style={[styles.powerLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ── Mute Button ──────────────────────────────────────────────────────

function MuteButton() {
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    setLoading(true);
    try {
      const res = await muteAudio(!muted);
      setMuted(!muted);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.muteBtn, pressed && { opacity: 0.7 }]}
      onPress={toggle}
      disabled={loading}
    >
      <Text style={styles.muteIcon}>{muted ? '🔇' : '🔊'}</Text>
      <Text style={styles.muteLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
    </Pressable>
  );
}

// ── Volume Control ───────────────────────────────────────────────────

function VolumeControl() {
  const [vol, setVol] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const loadVol = async () => {
    try {
      const res = await getVolume();
      if (res.volume !== undefined) setVol(res.volume);
    } catch {}
  };
  useEffect(() => { loadVol(); }, []);
  const changeVol = async (delta: number) => {
    if (vol === null) return;
    setLoading(true);
    const newVol = Math.max(0, Math.min(100, vol + delta));
    try {
      await setVolume(newVol);
      setVol(newVol);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };
  return (
    <View style={styles.volRow}>
      <Text style={styles.volLabel}>Volume: {vol ?? '?'}%</Text>
      <View style={styles.volBtns}>
        <Pressable style={styles.volBtn} onPress={() => changeVol(-10)} disabled={loading}>
          <Text style={styles.volBtnText}>−10</Text>
        </Pressable>
        <MuteButton />
        <Pressable style={styles.volBtn} onPress={() => changeVol(10)} disabled={loading}>
          <Text style={styles.volBtnText}>+10</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Now Playing ──────────────────────────────────────────────────────

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
    <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.nowPlayingCard}>
      <View style={styles.npHeader}>
        <View style={styles.npInfo}>
          <Text style={styles.npTitle} numberOfLines={1}>{track.title || 'Unknown'}</Text>
          {track.artist && <Text style={styles.npArtist} numberOfLines={1}>{track.artist}</Text>}
          {track.source_app && <Text style={styles.npSource}>{track.source_app}</Text>}
        </View>
        <View style={styles.npIndicator}>
          <View style={[styles.npDot, track.is_playing && styles.npDotActive]} />
        </View>
      </View>
      <View style={styles.npControls}>
        <Pressable style={styles.npBtn} onPress={() => send('prev')}>
          <Text style={styles.npBtnText}>⏮</Text>
        </Pressable>
        <Pressable style={[styles.npBtn, styles.npPlayBtn]} onPress={() => send('play_pause')}>
          <Text style={styles.npBtnText}>{track.is_playing ? '⏸' : '▶️'}</Text>
        </Pressable>
        <Pressable style={styles.npBtn} onPress={() => send('next')}>
          <Text style={styles.npBtnText}>⏭</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Quick Launch Grid ────────────────────────────────────────────────

const APPS = [
  { name: 'Spotify',   app: 'spotify',       icon: '🎵' },
  { name: 'Chrome',    app: 'chrome',        icon: '🌐' },
  { name: 'VS Code',   app: 'vscode',        icon: '💻' },
  { name: 'Discord',   app: 'discord',       icon: '💬' },
  { name: 'Terminal',  app: 'terminal',      icon: '⬛' },
  { name: 'Notepad',   app: 'notepad',       icon: '📝' },
  { name: 'Explorer',  app: 'file explorer', icon: '📁' },
  { name: 'Steam',     app: 'steam',         icon: '🎮' },
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
      {APPS.map((app, i) => (
        <Pressable
          key={app.app}
          style={({ pressed }) => [styles.appBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleLaunch(app.app)}
          disabled={launching === app.app}
        >
          {launching === app.app ? (
            <ActivityIndicator color={colors.accentCyan} size="small" />
          ) : (
            <Text style={styles.appIcon}>{app.icon}</Text>
          )}
          <Text style={styles.appName}>{app.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Clipboard Section ────────────────────────────────────────────────

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
    <View style={styles.clipSection}>
      <TextInput
        style={styles.clipInput}
        value={text}
        onChangeText={setText}
        placeholder="Text to copy to PC..."
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <View style={styles.clipBtns}>
        <Pressable style={styles.clipBtn} onPress={handleCopy} disabled={copying || !text.trim()}>
          <Text style={styles.clipBtnText}>{copying ? '...' : '↑ Copy to PC'}</Text>
        </Pressable>
        <Pressable style={styles.clipBtn} onPress={handlePaste} disabled={pasting}>
          <Text style={styles.clipBtnText}>{pasting ? '...' : '↓ Read PC'}</Text>
        </Pressable>
      </View>
      {pcClip ? (
        <View style={styles.clipResult}>
          <Text style={styles.clipResultLabel}>PC Clipboard:</Text>
          <Text style={styles.clipResultText} numberOfLines={3}>{pcClip}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── News Headlines ───────────────────────────────────────────────────

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

  return (
    <View style={styles.newsSection}>
      <Text style={styles.sectionTitle}>📰 Headlines</Text>
      {headlines.map((h, i) => (
        <View key={i} style={styles.newsItem}>
          <Text style={styles.newsTitle} numberOfLines={2}>{h.title}</Text>
          <Text style={styles.newsSource}>{h.source}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export default function ActionsScreen() {
  const router = useRouter();
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
        <Text style={styles.headerTitle}>Actions</Text>
        <View style={styles.headerLinks}>
          <Pressable onPress={() => router.push('/notes')}>
            <Text style={styles.headerLink}>Notes</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/files')}>
            <Text style={styles.headerLink}>Files</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/processes')}>
            <Text style={styles.headerLink}>Procs</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentCyan} colors={[colors.accentCyan]} />
        }
      >
        {/* Weather + Briefing */}
        <WeatherWidget data={weather} />
        <BriefingButton />

        {/* Power Controls */}
        <Text style={styles.sectionTitle}>⚡ System</Text>
        <View style={styles.powerGrid}>
          <PowerButton icon="🔒" label="Lock" color={colors.accentCyan} onPress={systemLock} />
          <PowerButton icon="🌙" label="Sleep" color={colors.accentPurple} onPress={systemSleep} />
          <PowerButton icon="🔄" label="Restart" color={colors.accentOrange} onPress={systemRestart} confirm="Restart your PC?" />
          <PowerButton icon="⏻" label="Shutdown" color={colors.accentRed} onPress={systemShutdown} confirm="Shut down your PC?" />
        </View>

        {/* Volume */}
        <Text style={styles.sectionTitle}>🔊 Audio</Text>
        <VolumeControl />

        {/* Now Playing */}
        <NowPlaying />

        {/* Quick Launch */}
        <Text style={styles.sectionTitle}>🚀 Quick Launch</Text>
        <QuickLaunch />

        {/* Clipboard */}
        <Text style={styles.sectionTitle}>📋 Clipboard</Text>
        <ClipboardSection />

        {/* News */}
        <NewsSection />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.accentCyan, fontSize: 20, fontWeight: '700' },
  headerLinks: { flexDirection: 'row', gap: 12 },
  headerLink: { color: colors.accentCyan, fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, gap: 16 },

  // Weather
  weatherCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  weatherTemp: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  weatherDesc: { color: colors.textSecondary, fontSize: 15 },

  // Briefing
  briefingBtn: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.accentCyan + '30',
  },
  briefingIcon: { fontSize: 24 },
  briefingText: { flex: 1 },
  briefingTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  briefingSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  briefingArrow: { color: colors.accentCyan, fontSize: 18, fontWeight: '700' },

  // Section
  sectionTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Power Grid
  powerGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  powerBtn: {
    width: '47%', aspectRatio: 1.6,
    backgroundColor: colors.bgSecondary, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1,
  },
  powerIcon: { fontSize: 28 },
  powerLabel: { fontSize: 13, fontWeight: '700' },

  // Volume
  volRow: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16, gap: 12,
  },
  volLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  volBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  volBtn: {
    flex: 1, backgroundColor: colors.bgTertiary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  volBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  muteBtn: {
    backgroundColor: colors.bgTertiary, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center', minWidth: 80,
  },
  muteIcon: { fontSize: 20 },
  muteLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Now Playing
  nowPlayingCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16, gap: 12,
  },
  npHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  npInfo: { flex: 1 },
  npTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  npArtist: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  npSource: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  npIndicator: {},
  npDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  npDotActive: { backgroundColor: colors.accentGreen },
  npControls: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  npBtn: { padding: 8 },
  npPlayBtn: { backgroundColor: colors.bgTertiary, borderRadius: 24, padding: 12 },
  npBtnText: { fontSize: 22 },

  // Quick Launch
  appGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  appBtn: {
    width: '22%', aspectRatio: 1,
    backgroundColor: colors.bgSecondary, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  appIcon: { fontSize: 24 },
  appName: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },

  // Clipboard
  clipSection: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16, gap: 10,
  },
  clipInput: {
    backgroundColor: colors.bgTertiary, borderRadius: 10,
    color: colors.textPrimary, padding: 12, fontSize: 14,
    minHeight: 60, textAlignVertical: 'top',
  },
  clipBtns: { flexDirection: 'row', gap: 10 },
  clipBtn: {
    flex: 1, backgroundColor: colors.accentCyan, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  clipBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  clipResult: {
    backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, gap: 4,
  },
  clipResultLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  clipResultText: { color: colors.textSecondary, fontSize: 13 },

  // News
  newsSection: { gap: 10 },
  newsItem: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 12, gap: 4,
  },
  newsTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  newsSource: { color: colors.textMuted, fontSize: 11 },
});
