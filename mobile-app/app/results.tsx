import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image as RNImage, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { useVideoPlayer, VideoView, type VideoPlayer, type VideoSource } from 'expo-video';
import {
  ArrowLeft,
  Download,
  Flame,
  Share2,
  Timer,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { Screen, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import { useDataStore } from '@/store/useAppStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { formatDuration } from '@/lib/utils';
import type { ExportableClip } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_GAP = spacing.md;

function Thumb({
  uri,
  style,
}: {
  uri?: string | null;
  style: object;
}) {
  const [error, setError] = useState(false);
  if (!uri || error) {
    return (
      <View style={[style, styles.thumbPlaceholder]}>
        <Flame size={40} color={colors.primary} strokeWidth={1.5} />
      </View>
    );
  }
  return <RNImage source={{ uri }} style={style} onError={() => setError(true)} resizeMode="cover" />;
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectIdParam = (params.projectId || params.id) as string | undefined;
  const clips = useDataStore((s) => s.clips);
  const clipsLoading = useDataStore((s) => s.clipsLoading);
  const clipsError = useDataStore((s) => s.clipsError);
  const loadClips = useDataStore((s) => s.loadClips);
  const resetClips = useDataStore((s) => s.resetClips);

  const [activeIndex, setActiveIndex] = useState(0);
  const [playerClip, setPlayerClip] = useState<ExportableClip | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const source = useMemo<VideoSource | null>(
    () => (playerClip ? { uri: playerClip.videoUrl } : null),
    [playerClip]
  );
  const player: VideoPlayer = useVideoPlayer(source, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (playerClip) {
      player.play();
    }
  }, [playerClip, player]);

  // Load this project's clips on mount and whenever the route param changes.
  useEffect(() => {
    resetClips();
    if (projectIdParam) {
      loadClips(projectIdParam);
    }
  }, [projectIdParam, loadClips, resetClips]);

  const handleLoad = useCallback(async () => {
    if (projectIdParam) await loadClips(projectIdParam);
  }, [projectIdParam, loadClips]);

  const shareClip = async (clip: ExportableClip) => {
    try {
      if (!(await isAvailableAsync())) return;
      
      const destination = new File(Paths.document, `${clip.id}.mp4`);
      
      if (!destination.exists) {
        await File.downloadFileAsync(clip.videoUrl, destination);
      }
      
      await shareAsync(destination.uri, { dialogTitle: `Share ${clip.title}` });
    } catch (e) {
      console.error(e);
      alert('Sharing failed');
    }
  };

  const downloadClip = async (clip: ExportableClip) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission required to save video');
        return;
      }
      setSaved((prev) => ({ ...prev, [clip.id]: true }));
      
      const destination = new File(Paths.document, `${clip.id}.mp4`);
      const output = await File.downloadFileAsync(clip.videoUrl, destination);
      await MediaLibrary.saveToLibraryAsync(output.uri);
      alert('Saved to gallery!');
    } catch (e) {
      setSaved((prev) => ({ ...prev, [clip.id]: false }));
      alert('Download failed');
      console.error(e);
    }
  };

  if (clipsLoading && clips.length === 0) {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }

  if (clipsError) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            onPress={() => {
              resetClips();
              router.replace('/');
            }}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Clips</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: spacing.md }}>
          <ErrorBanner message={clipsError} onRetry={handleLoad} />
        </View>
      </Screen>
    );
  }

  if (clips.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            onPress={() => {
              resetClips();
              router.replace('/');
            }}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Clips</Text>
          <View style={{ width: 40 }} />
        </View>
        <EmptyState
          icon={<TriangleAlert size={48} color={colors.textMuted} strokeWidth={1.5} />}
          title="No clips yet"
          subtitle="This project has no exportable clips."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          onPress={() => {
            setPlayerClip(null);
            resetClips();
            router.back();
          }}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Clips</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        horizontal
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        contentContainerStyle={styles.carousel}
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
          const clamped = Math.min(clips.length - 1, Math.max(0, idx));
          setActiveIndex((prev) => (prev === clamped ? prev : clamped));
        }}
        scrollEventThrottle={16}
      >
        {clips.map((clip, i) => (
          <View key={clip.id} style={[styles.card, i === activeIndex && styles.cardActive]}>
            <Pressable style={styles.thumbWrap} onPress={() => setPlayerClip(clip)}>
              <Thumb uri={clip.thumbnailUrl} style={styles.thumbImage} />
              <View style={styles.durationBadge}>
                <Timer size={11} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.durationText}>{formatDuration(clip.durationMs)}</Text>
              </View>
              <View style={styles.playHint}>
                <Text style={styles.playHintText}>Tap to play</Text>
              </View>
            </Pressable>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {clip.title || 'Viral Clip'}
              </Text>
              <View style={styles.scoreRow}>
                <Flame size={13} color={colors.warning} strokeWidth={2.5} />
                <Text style={styles.scoreLabel}>Virality Score</Text>
                <Text style={styles.scoreValue}>{clip.viralityScore}</Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => downloadClip(clip)}
                >
                  <Download size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.actionTextPrimary}>{saved[clip.id] ? 'Saved' : 'Download'}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionSecondary,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => shareClip(clip)}
                >
                  <Share2 size={16} color={colors.primary} strokeWidth={2.5} />
                  <Text style={styles.actionTextSecondary}>Share</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {clips.map((c, i) => (
          <View key={c.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      {playerClip && source ? (
        <View style={styles.playerOverlay}>
          <View style={styles.playerHeader}>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
              onPress={() => setPlayerClip(null)}
            >
              <X size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {playerClip.title}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <VideoView
            player={player}
            style={styles.videoView}
            contentFit="contain"
            nativeControls
          />
          <View style={styles.playerFooter}>
            <View style={styles.scoreRow}>
              <Flame size={14} color={colors.warning} strokeWidth={2.5} />
              <Text style={styles.scoreLabel}>Virality Score</Text>
              <Text style={styles.scoreValue}>{playerClip.viralityScore}</Text>
            </View>
            <Text style={styles.playerDuration}>{formatDuration(playerClip.durationMs)}</Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  carousel: {
    alignItems: 'center',
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    gap: CARD_GAP,
    paddingVertical: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    opacity: 0.55,
    transform: [{ scale: 0.94 }],
  },
  cardActive: {
    opacity: 1,
    transform: [{ scale: 1 }],
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  thumbWrap: {
    width: '100%',
    height: CARD_WIDTH * 1.6,
    backgroundColor: colors.surfaceHighlight,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: fonts.semiBold,
  },
  playHint: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  playHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: fonts.semiBold,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
    lineHeight: 21,
    minHeight: 42,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fonts.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  actionTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  actionTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  playerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
    zIndex: 10,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  videoView: {
    flex: 1,
    width: '100%',
  },
  playerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.xl + 16,
  },
  playerDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
});
