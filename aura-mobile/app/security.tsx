import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, Alert, Switch,
} from 'react-native';
import { useAuth } from '../src/stores/authStore';
import { colors, spacing, radius, typography } from '../src/theme';
import GlassCard from '../src/components/GlassCard';
import GlassButton from '../src/components/GlassButton';
import GlassInput from '../src/components/GlassInput';

export default function SecurityScreen() {
  const { lockEnabled, pinSet, enableLock, disableLock, changePin } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [changing, setChanging] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    setIsEnabled(lockEnabled);
  }, [lockEnabled]);

  const toggleLock = async (value: boolean) => {
    if (value) {
      setSettingUp(true);
    } else {
      Alert.alert('Disable Lock', 'Remove all authentication?', [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsEnabled(true) },
        { text: 'Disable', style: 'destructive', onPress: disableLock },
      ]);
    }
  };

  const handleSetup = async () => {
    if (newPin.length < 4) { Alert.alert('Error', 'PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { Alert.alert('Error', 'PINs do not match'); return; }
    await enableLock(newPin);
    setNewPin('');
    setConfirmPin('');
    setSettingUp(false);
    Alert.alert('Enabled', 'Screen lock is now active');
  };

  const handleChangePin = async () => {
    if (!oldPin || newPin.length < 4) { Alert.alert('Error', 'Enter current and new PIN'); return; }
    if (newPin !== confirmPin) { Alert.alert('Error', 'PINs do not match'); return; }
    const ok = await changePin(oldPin, newPin);
    if (ok) {
      setOldPin(''); setNewPin(''); setConfirmPin('');
      setChanging(false);
      Alert.alert('Success', 'PIN updated');
    } else {
      Alert.alert('Error', 'Current PIN is incorrect');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security</Text>
      </View>
      <View style={styles.content}>
        <GlassCard>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Screen Lock</Text>
              <Text style={styles.rowHint}>
                {isEnabled ? 'Fingerprint or PIN required to open app' : 'No authentication required'}
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={toggleLock}
              trackColor={{ false: colors.glassBg, true: colors.primary + '60' }}
              thumbColor={isEnabled ? colors.primary : colors.onSurfaceMuted}
            />
          </View>
        </GlassCard>

        {settingUp && (
          <GlassCard>
            <Text style={styles.sectionTitle}>Set PIN</Text>
            <GlassInput
              style={styles.input}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="New PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <GlassInput
              style={styles.input}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="Confirm PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <GlassButton variant="primary" onPress={handleSetup}>
              Enable Lock
            </GlassButton>
          </GlassCard>
        )}

        {isEnabled && !settingUp && (
          <>
            {changing ? (
              <GlassCard>
                <Text style={styles.sectionTitle}>Change PIN</Text>
                <GlassInput
                  style={styles.input}
                  value={oldPin}
                  onChangeText={setOldPin}
                  placeholder="Current PIN"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <GlassInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                  placeholder="New PIN"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <GlassInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder="Confirm New PIN"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <GlassButton variant="primary" onPress={handleChangePin}>
                  Update PIN
                </GlassButton>
                <GlassButton variant="ghost" onPress={() => setChanging(false)}>
                  Cancel
                </GlassButton>
              </GlassCard>
            ) : (
              <Pressable style={styles.linkRow} onPress={() => setChanging(true)}>
                <Text style={styles.linkText}>Change PIN</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  headerTitle: { ...typography.headlineMd, color: colors.primary, fontSize: 20 },
  content: { padding: spacing.lg, gap: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rowInfo: { flex: 1, marginRight: spacing.md },
  rowLabel: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  rowHint: { ...typography.labelSm, color: colors.onSurface, marginTop: spacing.xs },
  sectionTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 15, marginBottom: spacing.sm },
  input: { letterSpacing: 4, textAlign: 'center' },
  linkRow: { paddingVertical: spacing.md },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
