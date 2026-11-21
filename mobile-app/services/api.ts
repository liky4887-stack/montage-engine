import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.43.101:8790';
const TOKEN_KEY = 'accessToken_v2';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

export const api = {
  async getProjects() {
    return [];
  },

  async pair(code: string) {
    const res = await client.post('/bridge/pair', { code });
    if (res.data.accessToken) {
      await AsyncStorage.setItem(TOKEN_KEY, res.data.accessToken);
    }
    return res.data;
  },

  async uploadVideo(fileUri: string) {
    const formData = new FormData();
    // Ensure Android sees the file:// prefix
    const uri = fileUri.startsWith('file://') ? fileUri : fileUri.replace('file:', 'file://');
    
    formData.append('file', {
      uri: uri,
      name: 'video.mp4',
      type: 'video/mp4',
    } as any);

    // DO NOT manually set Content-Type: multipart/form-data
    const res = await client.post('/bridge/uploads', formData);
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
