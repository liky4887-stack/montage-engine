import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  Clock,
  Clapperboard,
  Film,
  Plus,
  Sparkles,
} from 'lucide-react-native';
import { Screen, ErrorBanner, EmptyState, Spinner } from '@/components/ui';
import { useDataStore } from '@/store/useAppStore';
import { colors, fonts, radius, spacing, statusMeta } from '@/lib/theme';
import { formatDate, formatDuration } from '@/lib/utils';
import type { ClipProject } from '@/types/api';

function statusBadge(status: ClipProject['status']) {
  const meta = statusMeta[status] ?? statusMeta.draft;
  return (
    <View style={[styles.badge, { backgroundColor: meta.soft }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { projects, projectsLoading, projectsError, loadProjects } = useDataStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProjects().catch(() => {});
    }, [loadProjects])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProjects();
    } catch {
      // error state handled by store
    } finally {
      setRefreshing(false);
    }
  }, [loadProjects]);

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Sparkles size={22} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>ClipForge AI</Text>
            <Text style={styles.subtitle}>Turn long videos into viral clips</Text>
          </View>
        </View>

        {projectsError ? (
          <ErrorBanner message={projectsError} onRetry={() => loadProjects().catch(() => {})} />
        ) : null}

        {projectsLoading && projects.length === 0 ? (
          <Spinner />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Clapperboard size={48} color={colors.textMuted} strokeWidth={1.5} />}
            title="No projects yet"
            subtitle="Create your first clip. Import a video and let the AI find the best moments."
          />
        ) : (
          <View style={styles.list}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                style={({ pressed }) => [styles.projectCard, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  if (project.status === 'completed') {
                    router.push({ pathname: '/results', params: { projectId: project.id } });
                  } else if (project.status === 'processing' || project.status === 'failed') {
                    router.push({ pathname: '/processing', params: { projectId: project.id } });
                  }
                }}
              >
                <View style={styles.projectThumb}>
                  <Film size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <View style={styles.projectMetaRow}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={colors.textMuted} strokeWidth={2} />
                      <Text style={styles.metaText}>
                        {project.durationMs ? formatDuration(project.durationMs) : '--:--'}
                      </Text>
                    </View>
                    <Text style={styles.metaText}>{formatDate(project.createdAt)}</Text>
                  </View>
                  <View style={{ marginTop: spacing.sm }}>{statusBadge(project.status)}</View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => router.push('/import')}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xl + 12,
    paddingBottom: spacing.xl * 3,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.bold,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  list: {
    gap: spacing.sm + 4,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  projectThumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  projectMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
});
