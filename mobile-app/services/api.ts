import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.43.101:8790';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // --- UI Stubs to prevent crashes ---
  async getProjects() {
    return []; // Returns empty list for now
  },

  // --- Engine & Bridge Connections ---
  async pair(code: string) {
    // If we route through the bridge, we hit the bridge's auth
    const res = await client.post('/bridge/pair', { code });
    if (res.data.accessToken) {
      await AsyncStorage.setItem('accessToken', res.data.accessToken);
    }
    return res.data;
  },

  async getCapabilities() {
    const res = await client.get('/bridge/capabilities');
    return res.data;
  },

  async uploadVideo(fileUri: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: 'video.mp4',
      type: 'video/mp4',
    } as any);

    const res = await client.post('/bridge/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async createJob(mediaFileId: string, type: 'probe' | 'trim', params: any = {}) {
    const res = await client.post('/bridge/jobs', {
      media_file_id: mediaFileId,
      type,
      params,
    });
    return res.data;
  },

  subscribeToJob(jobId: string, onProgress: (data: any) => void) {
    const url = `${API_BASE}/bridge/jobs/${jobId}/events`;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onProgress(data);
      if (data.status === 'completed' || data.status === 'failed') {
        eventSource.close();
      }
    };
    return () => eventSource.close();
  }
};
