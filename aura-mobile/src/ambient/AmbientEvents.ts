import { useEffect, useRef } from 'react';
import { useWs } from '../stores/wsStore';
import { useDesktopPresence } from '../desktop';
import { useAmbient } from './AmbientProvider';
import { speak as localSpeak } from '../services/tts';
import { useSettings } from '../stores/settingsStore';

export function useAmbientEvents() {
  const { emit } = useAmbient();
  const wsConnected = useWs((s) => s.connected);
  const { state: presence } = useDesktopPresence();
  const prevConnected = useRef(wsConnected);
  const prevCpu = useRef<number | null>(null);
  const prevMedia = useRef<string | null>(null);
  const prevBattery = useRef<number | null>(null);

  const ambientSpeak = useSettings((s) => s.ambientSpeakEnabled);

  const maybeSpeak = (text: string) => {
    if (!ambientSpeak) return;
    void localSpeak(text);
  };

  useEffect(() => {
    if (prevConnected.current !== wsConnected) {
      if (wsConnected) {
        emit('desktop:reconnected', 'Desktop Reconnected', 'Connection restored');
        maybeSpeak('PC is back online.');
      } else {
        emit('desktop:disconnected', 'Desktop Disconnected', 'Connection lost');
        maybeSpeak('PC connection lost.');
      }
      prevConnected.current = wsConnected;
    }
  }, [wsConnected, emit, ambientSpeak]);

  useEffect(() => {
    if (!presence.system) return;

    const cpu = presence.system.cpu_percent;
    if (prevCpu.current !== null && cpu > 85 && prevCpu.current <= 85) {
      emit('system:cpu_high', `CPU at ${cpu}%`, 'High usage detected', { metadata: { cpu } });
      maybeSpeak(`CPU usage is high at ${cpu} percent.`);
    }
    prevCpu.current = cpu;
  }, [presence.system?.cpu_percent, emit, ambientSpeak]);

  useEffect(() => {
    if (!presence.media?.title) return;
    if (prevMedia.current !== presence.media.title) {
      emit('media:changed', `Now Playing: ${presence.media.title}`, presence.media.app || 'Media');
    }
    prevMedia.current = presence.media.title;
  }, [presence.media?.title, presence.media?.app, emit]);

  useEffect(() => {
    if (!presence.battery) return;
    const pct = presence.battery.percent;
    if (prevBattery.current !== null && pct <= 20 && !presence.battery.charging && prevBattery.current > 20) {
      emit('system:battery_low', `Battery at ${pct}%`, 'Low battery — plug in soon');
      maybeSpeak(`Battery is at ${pct} percent. Plug in soon.`);
    }
    prevBattery.current = pct;
  }, [presence.battery?.percent, presence.battery?.charging, emit, ambientSpeak]);
}

export function AmbientEventWiring() {
  useAmbientEvents();
  return null;
}
