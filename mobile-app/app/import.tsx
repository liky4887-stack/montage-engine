import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ArrowRight, Video } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { api } from '../services/api';

export default function ImportScreen() {
  const router = useRouter();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedUri(result.assets[0].uri);
    }
  };

  const uploadAndProceed = async () => {
    if (!selectedUri) return;
    setUploading(true);

    try {
      // 1. Upload to engine
      const res = await api.uploadVideo(selectedUri);
      
      // 2. Navigate to AI settings or processing screen
      // Assuming the upload returns a file ID
      router.push({
        pathname: '/ai-settings',
        params: { mediaFileId: res.id || res.file_id }
      });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Failed', err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Import Video</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Select Local Video</Text>
          
          <Pressable 
            style={styles.pickerButton} 
            onPress={pickVideo}
            disabled={uploading}
          >
            <Video size={24} color={colors.text} />
            <Text style={styles.pickerText}>
              {selectedUri ? 'Video Selected ✅' : 'Pick a Video from Gallery'}
            </Text>
          </Pressable>

          {selectedUri && (
            <Text style={styles.hint} numberOfLines={1} ellipsizeMode="middle">
              {selectedUri}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.nextButton,
            (!selectedUri || uploading) && styles.nextButtonDisabled,
          ]}
          onPress={uploadAndProceed}
          disabled={!selectedUri || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                Next: AI Settings
              </Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8714C', // Matches the orange from your screenshots
    padding: 16,
    borderRadius: radius.md,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
  },
});
