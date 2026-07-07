import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, RefreshControl, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getProcesses, killProcess } from '../../src/api/aura';
import { colors, spacing, radius, typography } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import GlassInput from '../../src/components/GlassInput';

type Proc = { pid: number; name: string };

export default function ProcessesScreen() {
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [count, setCount] = useState(0);
  const [showSystem, setShowSystem] = useState(false);
  const [killing, setKilling] = useState<number | null>(null);

  const loadProcesses = useCallback(async (search?: string, sys?: boolean) => {
    setLoading(true);
    try {
      const data = await getProcesses(search || undefined, !sys);
      if (data.processes) {
        setProcesses(data.processes);
        setCount(data.count);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadProcesses(); }, [loadProcesses]));

  const handleKill = (proc: Proc) => {
    Alert.alert(
      'Kill Process',
      `Terminate "${proc.name}" (PID: ${proc.pid})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kill', style: 'destructive',
          onPress: async () => {
            setKilling(proc.pid);
            try {
              const res = await killProcess(proc.pid);
              if (res.error) Alert.alert('Error', res.error);
              else loadProcesses(filter, showSystem);
            } catch (e: any) { Alert.alert('Error', e.message); }
            finally { setKilling(null); }
          },
        },
      ],
    );
  };

  const toggleSystem = () => {
    const next = !showSystem;
    setShowSystem(next);
    loadProcesses(filter, next);
  };

  const renderItem = ({ item, index }: { item: Proc; index: number }) => (
    <Animated.View entering={FadeInDown.duration(150).delay(Math.min(index * 15, 200))}>
      <GlassCard>
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPid}>PID {item.pid}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.killBtn, pressed && { opacity: 0.85 }]}
            onPress={() => handleKill(item)}
            disabled={killing === item.pid}
          >
            <MaterialIcons name={killing === item.pid ? 'hourglass-empty' : 'close'} size={14} color={colors.error} />
          </Pressable>
        </View>
      </GlassCard>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Processes</Text>
          <Text style={styles.headerSub}>{count} running</Text>
        </View>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={16} color={colors.onSurfaceMuted} style={styles.searchIcon} />
          <GlassInput
            style={styles.search}
            value={filter}
            onChangeText={(t) => { setFilter(t); loadProcesses(t, showSystem); }}
            placeholder="Filter processes..."
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.sysToggle, showSystem && styles.sysToggleActive, pressed && { opacity: 0.85 }]}
          onPress={toggleSystem}
        >
          <MaterialIcons name="settings-ethernet" size={14} color={showSystem ? colors.primary : colors.onSurfaceMuted} />
          <Text style={[styles.sysToggleText, showSystem && { color: colors.primary }]}>SYS</Text>
        </Pressable>
      </View>
      <FlatList
        data={processes}
        keyExtractor={(item) => `${item.pid}-${item.name}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => loadProcesses(filter, showSystem)} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialIcons name="developer-board" size={40} color={colors.onSurfaceDim} />
            <Text style={styles.muted}>{loading ? 'Loading...' : 'No matching processes'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18, letterSpacing: 1 },
  headerSub: { color: colors.onSurface, fontSize: 11, fontWeight: '500', marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: spacing.sm, margin: spacing.lg, alignItems: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radius.input, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  searchIcon: { paddingLeft: spacing.md },
  search: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  sysToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.glassBg, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  sysToggleActive: { backgroundColor: 'rgba(0,242,255,0.12)', borderColor: colors.primary + '40' },
  sysToggleText: { color: colors.onSurface, fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  itemPid: { ...typography.mono, color: colors.onSurface, marginTop: 2 },
  killBtn: {
    backgroundColor: 'rgba(255,69,58,0.12)', borderRadius: spacing.sm,
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.error + '30',
  },
  center: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  muted: { color: colors.onSurface, fontSize: 14 },
});
