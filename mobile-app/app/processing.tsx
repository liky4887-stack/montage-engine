import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/services/api';
import { ProgressResponse } from '@/types/api';

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = (params.projectId || params.id) as string;

  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('downloading');
  const [stages, setStages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!projectId) {
      setError("No Project ID provided");
      return;
    }

    let interval: ReturnType<typeof setInterval>;

    const checkProgress = async () => {
      try {
        const res: ProgressResponse = await api.getProgress(projectId);
        if (!isMounted.current) return;
        setProgress(res.progress);
        setCurrentStage(res.currentStage || 'processing');
        if (res.stages) setStages(res.stages);

        if (res.status === 'completed') {
          clearInterval(interval);
          router.replace({ pathname: '/results', params: { projectId } });
        } else if (res.status === 'failed') {
          clearInterval(interval);
          setError("The video processing failed on the server.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to check progress");
        clearInterval(interval);
      }
    };

    checkProgress();
    interval = setInterval(checkProgress, 3000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [projectId, router]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[styles.title, { color: '#FF4B4B' }]}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Processing</Text>
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stageText}>{currentStage.replace('_', ' ')}</Text>
      </View>
      <View style={styles.stagesList}>
        {stages.map((stage, idx) => (
          <View key={idx} style={styles.stageRow}>
            <View style={[
              styles.stageIndicator,
              stage.status === 'completed' && styles.stageCompleted,
              stage.status === 'active' && styles.stageActive
            ]}>
              {stage.status === 'active' && <ActivityIndicator size="small" color="#6C63FF" />}
              {stage.status === 'completed' && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={[
              styles.stageLabel,
              stage.status === 'active' && styles.stageLabelActive
            ]}>{stage.label}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 40, marginBottom: 30, textAlign: 'center' },
  progressContainer: { width: '100%', alignItems: 'center', marginTop: 50, marginBottom: 50 },
  progressText: { fontSize: 60, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  barBackground: { width: '90%', height: 16, backgroundColor: '#222', borderRadius: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 8 },
  stageText: { color: '#aaa', marginTop: 15, fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  stagesList: { width: '90%', alignSelf: 'center', marginTop: 20 },
  stageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stageIndicator: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  stageCompleted: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  stageActive: { borderColor: '#6C63FF' },
  stageLabel: { fontSize: 18, color: '#666' },
  stageLabelActive: { color: '#fff', fontWeight: 'bold' },
  checkMark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  errorText: { color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 30 },
  button: { backgroundColor: '#6C63FF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
