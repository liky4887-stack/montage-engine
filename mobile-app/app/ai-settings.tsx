import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { ArrowLeft, Check, ChevronDown, Sparkles, Wand2 } from 'lucide-react-native';
import { Screen, SectionTitle, Card } from '@/components/ui';
import { useDraftStore } from '@/store/useAppStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';

const GENRES = ['Auto', 'Podcast', 'Gaming', 'Education'] as const;
const DURATIONS = [30, 60, 90] as const;
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'] as const;

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.surfaceHighlight}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      {active ? <Check size={14} color={colors.primary} strokeWidth={3} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AiSettingsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    youtubeUrl,
    projectTitle,
    setProjectTitle,
    customPrompt,
    setCustomPrompt,
    genre,
    setGenre,
    clipDurations,
    toggleClipDuration,
    enableAutoHook,
    setEnableAutoHook,
    skipSlicing,
    setSkipSlicing,
    enableCaption,
    setEnableCaption,
    enableEmoji,
    setEnableEmoji,
    enableWatermark,
    setEnableWatermark,
    aspectRatio,
    setAspectRatio,
  } = useDraftStore();

  const showGenreDropdown = genre !== 'Auto';

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionTitle>Project</SectionTitle>
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Podcast Episode"
            placeholderTextColor={colors.textMuted}
            value={projectTitle}
            onChangeText={setProjectTitle}
            maxLength={80}
          />
        </Card>

        <SectionTitle>AI Curation</SectionTitle>
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Custom Prompt</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what makes a great clip for this video…"
            placeholderTextColor={colors.textMuted}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Genre</Text>
          <View style={styles.genreRow}>
            {GENRES.map((g) => (
              <Chip key={g} label={g} active={genre === g} onPress={() => setGenre(g)} />
            ))}
          </View>
          {showGenreDropdown ? (
            <View style={styles.genreDetail}>
              <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.genreDetailText}>
                AI will optimize curation for {genre.toLowerCase()} content
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Clip Durations</Text>
          <View style={styles.genreRow}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={`${d}s`}
                active={clipDurations.includes(d)}
                onPress={() => toggleClipDuration(d)}
              />
            ))}
          </View>
        </Card>

        <SectionTitle>Curation Options</SectionTitle>
        <Card style={styles.card}>
          <ToggleRow
            label="Enable Auto-Hook"
            description="AI adds an attention-grabbing hook at the start of each clip"
            value={enableAutoHook}
            onChange={setEnableAutoHook}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Skip Slicing"
            description="Analyze the full video without cutting it into clips"
            value={skipSlicing}
            onChange={setSkipSlicing}
          />
        </Card>

        <SectionTitle>Render Settings</SectionTitle>
        <Card style={styles.card}>
          <ToggleRow
            label="Enable Captions"
            description="Burn animated subtitles into the clips"
            value={enableCaption}
            onChange={setEnableCaption}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Enable Emojis (Coming soon)"
            description="Expressive emojis on captions — shipping in a later update"
            value={false}
            onChange={() => {}}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Enable Watermark (Coming soon)"
            description="Brand watermark on exports — shipping in a later update"
            value={false}
            onChange={() => {}}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Aspect Ratio</Text>
          <View style={styles.ratioRow}>
            {ASPECT_RATIOS.map((r) => (
              <Pressable
                key={r}
                style={[styles.ratioBox, aspectRatio === r && styles.ratioBoxActive]}
                onPress={() => setAspectRatio(r)}
              >
                <View style={[styles.ratioPreview, ratioPreviewStyle(r), aspectRatio === r && styles.ratioPreviewActive]} />
                <Text
                  style={[styles.ratioText, aspectRatio === r && styles.ratioTextActive]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.generateButton, pressed && { opacity: 0.85 }]}
          onPress={async () => {
          setIsLoading(true);
          try {
            const finalUrl = youtubeUrl || '';
            const response = await api.createProject({
              videoUrl: finalUrl,
              brandTemplateId: null,
              curationPref: {
                clipDurations: [clipDurations.length > 0 ? clipDurations : [30]],
                customPrompt: customPrompt,
                genre: genre,
                model: 'clipforge-v2',
                skipCurate: false,
                skipSlicing: skipSlicing,
                topicKeywords: [],
                enableAutoHook: enableAutoHook,
                range: null,
                activeLang: null,
                narratives: null
              },
              importPref: { sourceLang: 'en' },
              renderPref: {
                layoutAspectRatio: aspectRatio,
                enableWatermark: enableWatermark,
                enableCaption: enableCaption,
                enableEmoji: enableEmoji
              },
              uploadedVideoAttr: { title: projectTitle || 'YouTube Import', durationMs: 600000 }
            });
            router.push({
              pathname: '/processing',
              params: { projectId: response.id }
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to start project";
              alert(msg);
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isLoading}
        >
          <Sparkles size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.generateButtonText}>{isLoading ? 'Starting...' : 'Generate Clips'}</Text>
          <Wand2 size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </Screen>
  );
}

function ratioPreviewStyle(ratio: string) {
  if (ratio === '9:16') return { width: 14, height: 24 };
  if (ratio === '1:1') return { width: 19, height: 19 };
  return { width: 28, height: 16 };
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  chipTextActive: {
    color: colors.primary,
  },
  genreDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  genreDetailText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  ratioRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratioBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratioBoxActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  ratioPreview: {
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  ratioPreviewActive: {
    backgroundColor: colors.primary,
  },
  ratioText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  ratioTextActive: {
    color: colors.primary,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
});
