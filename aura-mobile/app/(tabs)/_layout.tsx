import { Text, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useState, useEffect } from 'react';
import { getHealth, getBaseUrl } from '../../src/api/aura';
import { colors } from '../../src/theme';

function ConnectionDot() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        await getHealth();
        setOk(true);
      } catch { setOk(false); }
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);
  if (ok === null) return null;
  return (
    <View style={[styles.dot, ok ? styles.dotOn : styles.dotOff]} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1117',
          borderTopColor: '#21262D',
        },
        tabBarActiveTintColor: '#58A6FF',
        tabBarInactiveTintColor: '#484F58',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ color, fontSize: 18 }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ color, fontSize: 18 }}>⚡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ color, fontSize: 18 }}>🧠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ color, fontSize: 18 }}>📊</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 8 },
  dotOn: { backgroundColor: '#3FB950' },
  dotOff: { backgroundColor: '#F85149' },
});
