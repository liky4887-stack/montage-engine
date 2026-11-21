import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Database, Info, ShieldCheck, Smartphone } from 'lucide-react-native';
import { Screen, Card, SectionTitle } from '@/components/ui';
import { API_BASE } from '@/services/api';
import { colors, fonts, radius, spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const [deviceId, setDeviceId] = useState('');


  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <SectionTitle>Connection</SectionTitle>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Database size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>API Endpoint</Text>
              <Text style={styles.rowValue}>{API_BASE}</Text>
            </View>
          </View>
        </Card>

        <SectionTitle>Device</SectionTitle>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Smartphone size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Anonymous Device ID</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {deviceId || '…'}
              </Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.iconWrap}>
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>No account required</Text>
              <Text style={styles.rowValue}>Usage stays private on this device</Text>
            </View>
          </View>
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Info size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>ClipForge AI</Text>
              <Text style={styles.rowValue}>Version 1.0.0</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowValue}>
                ClipForge AI turns long-form videos into short, shareable clips using AI curation.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.bold,
    marginBottom: spacing.lg,
    lineHeight: 34,
  },
  card: {
    padding: spacing.md,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  rowValue: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});
