import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import GlanceHeader from '../GlanceHeader';
import { useGlance } from '../GlanceContext';
import { text, glass, accent, semantic } from '../../../tokens/colors';
import { typography } from '../../../tokens/typography';
import { spacing } from '../../../tokens/spacing';
import { radius } from '../../../tokens/radius';
import { mediaControl, getVolume, setVolume, muteAudio, getNowPlaying } from '../../../api/aura';
import { useDesktopPresence } from '../../../desktop';
import { haptic } from '../../../motion/haptics';
import Icon from '../../Icon';
import { duration as dur } from '../../../tokens/animation';

export default function MediaGlance() {
  const { updateGlanceData } = useGlance();
  const { state: presence, refresh } = useDesktopPresence();
  const [volume, setVolState] = useState<number | null>(null);
  const [prevVolume, setPrevVolume] = useState<number>(50);
  const [muted, setMuted] = useState(false);
  const [duration, setDurationState] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const track = presence.media;

  useEffect(() => {
    if (track) updateGlanceData('media', track);
  }, [track]);

  useEffect(() => {
    getVolume().then((d) => {
      if (d.volume !== undefined) {
        setVolState(d.volume);
        if (d.muted !== undefined) setMuted(d.muted);
      }
    }).catch(() => {});
  }, []);

  const send = useCallback(async (action: string, value?: number) => {
    haptic.press();
    try { await mediaControl(action, value); } catch {}
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    const rounded = Math.round(val);
    setVolState(rounded);
  }, []);

  const handleVolumeCommit = useCallback(async (val: number) => {
    const rounded = Math.round(val);
    setVolState(rounded);
    try { await setVolume(rounded); } catch {}
  }, []);

  const handleMute = useCallback(async () => {
    haptic.toggle();
    if (!muted && volume != null) setPrevVolume(volume);
    const next = !muted;
    setMuted(next);
    try {
      await muteAudio(next);
      if (next) {
        setVolState(0);
      } else {
        setVolState(prevVolume);
        await setVolume(prevVolume);
      }
    } catch {}
  }, [muted, volume, prevVolume]);

  const getProgress = () => {
    if (duration <= 0) return 0;
    return currentTime / duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <GlanceHeader icon="music-note" title="Media" subtitle={track ? track.app || 'Now Playing' : 'No active media'} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {track ? (
          <Animated.View entering={FadeInDown.duration(dur.slow).delay(100)} style={styles.nowPlayingCard}>
            <View style={styles.artContainer}>
              <View style={styles.albumArt}>
                <Icon name="music-note" size={32} color={accent.cyan} />
              </View>
            </View>

            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
              {track.artist ? (
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
              ) : null}
              {track.app ? (
                <Text style={styles.trackSource} numberOfLines={1}>{track.app}</Text>
              ) : null}
            </View>

            {duration > 0 ? (
              <View style={styles.progressSection}>
                <Slider
                  style={styles.progressSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={getProgress()}
                  onSlidingComplete={(v) => {
                    send('seek', Math.round(v * duration));
                  }}
                  minimumTrackTintColor={accent.cyan}
                  maximumTrackTintColor="rgba(255,255,255,0.08)"
                  thumbTintColor={accent.cyan}
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.controlsRow}>
              <Pressable onPress={() => send('prev')} style={styles.ctrlBtn}>
                <Icon name="skip-previous" size={20} color={text.secondary} />
              </Pressable>
              <Pressable onPress={() => send('play_pause')} style={styles.playBtn}>
                <Icon name={track.is_playing ? 'pause' : 'play-arrow'} size={28} color={accent.cyan} />
              </Pressable>
              <Pressable onPress={() => send('next')} style={styles.ctrlBtn}>
                <Icon name="skip-next" size={20} color={text.secondary} />
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(dur.slow).delay(100)} style={styles.noMedia}>
            <Icon name="music-note" size={36} color={text.tertiary} />
            <Text style={styles.noMediaText}>No media playing</Text>
            <Text style={styles.noMediaSub}>Play something on your desktop</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(dur.slow).delay(200)} style={styles.volumeCard}>
          <View style={styles.volumeHeader}>
            <View style={styles.volumeLabelRow}>
              <Icon name="volume-up" size={16} color={text.secondary} />
              <Text style={styles.volumeLabel}>Volume</Text>
            </View>
            <Text style={styles.volumeValue}>{muted ? 'Muted' : `${volume ?? 0}%`}</Text>
          </View>

          <View style={styles.volumeSliderRow}>
            <Pressable onPress={handleMute} style={styles.muteBtn}>
              <Icon name={muted ? 'volume-off' : 'volume-up'} size={16} color={muted ? semantic.error : text.secondary} />
            </Pressable>
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={100}
              step={2}
              value={muted ? 0 : (volume ?? 50)}
              onValueChange={handleVolumeChange}
              onSlidingComplete={handleVolumeCommit}
              minimumTrackTintColor={accent.cyan}
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor={accent.cyan}
              disabled={muted}
            />
          </View>

          <View style={styles.outputRow}>
            <Icon name="speaker" size={12} color={text.tertiary} />
            <Text style={styles.outputText}>Desktop speakers</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.space20,
  },
  nowPlayingCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${accent.cyan}25`,
    padding: spacing.space20,
    marginTop: spacing.space12,
    gap: spacing.space16,
  },
  artContainer: {
    alignItems: 'center',
  },
  albumArt: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: `${accent.cyan}08`,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    gap: spacing.space4,
  },
  trackTitle: {
    ...typography.heading2,
    color: text.primary,
    textAlign: 'center',
  },
  trackArtist: {
    ...typography.body,
    color: text.secondary,
    textAlign: 'center',
  },
  trackSource: {
    ...typography.caption,
    color: text.tertiary,
    textAlign: 'center',
  },
  progressSection: {
    gap: spacing.space4,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...typography.mono,
    fontSize: 11,
    color: text.tertiary,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.space32,
    paddingTop: spacing.space8,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${accent.cyan}12`,
    borderWidth: 1,
    borderColor: `${accent.cyan}30`,
  },
  noMedia: {
    alignItems: 'center',
    paddingTop: spacing.space32,
    gap: spacing.space8,
    marginTop: spacing.space12,
  },
  noMediaText: {
    ...typography.body,
    color: text.secondary,
    fontWeight: '600',
  },
  noMediaSub: {
    ...typography.bodySmall,
    color: text.tertiary,
  },
  volumeCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.space16,
    marginTop: spacing.space12,
    marginBottom: spacing.space24,
    gap: spacing.space12,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  volumeLabel: {
    ...typography.bodySmall,
    color: text.secondary,
    fontWeight: '600',
  },
  volumeValue: {
    ...typography.mono,
    color: accent.cyan,
    fontWeight: '700',
  },
  volumeSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  muteBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingTop: spacing.space4,
  },
  outputText: {
    ...typography.caption,
    color: text.tertiary,
    fontSize: 10,
  },
});
