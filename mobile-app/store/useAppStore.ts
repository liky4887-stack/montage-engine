import { create } from 'zustand';
import { api } from '@/services/api';
import type {
  ClipProject,
  ExportableClip,
  ProcessingError,
} from '@/types/api';

interface DataState {
  projects: ClipProject[];
  projectsLoading: boolean;
  projectsError: string | null;
  clips: ExportableClip[];
  clipsLoading: boolean;
  clipsError: string | null;

  loadProjects: () => Promise<void>;
  loadClips: (projectId: string) => Promise<void>;
  resetClips: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  projects: [],
  projectsLoading: false,
  projectsError: null,
  clips: [],
  clipsLoading: false,
  clipsError: null,

  loadProjects: async () => {
    set({ projectsLoading: true, projectsError: null });
    try {
      const projects = await api.getProjects();
      set({ projects, projectsLoading: false });
    } catch (error) {
      const err = error as ProcessingError;
      set({ projectsLoading: false, projectsError: err.message });
    }
  },

  loadClips: async (projectId: string) => {
    set({ clipsLoading: true, clipsError: null });
    try {
      const clips = await api.getExportableClips(projectId);
      set({ clips, clipsLoading: false });
    } catch (error) {
      const err = error as ProcessingError;
      set({ clipsLoading: false, clipsError: err.message });
    }
  },

  resetClips: () => set({ clips: [], clipsLoading: false, clipsError: null }),
}));

export type SourceType = 'local' | 'youtube';

export interface DraftVideoAsset {
  uri: string;
  title: string;
  durationMs: number;
  fileSize?: number | null;
}

interface DraftState {
  sourceType: SourceType;
  videoAsset: DraftVideoAsset | null;
  youtubeUrl: string;
  projectTitle: string;
  customPrompt: string;
  genre: string;
  clipDurations: number[];
  enableAutoHook: boolean;
  skipSlicing: boolean;
  enableCaption: boolean;
  enableEmoji: boolean;
  enableWatermark: boolean;
  aspectRatio: string;

  setSourceType: (type: SourceType) => void;
  setVideoAsset: (asset: DraftVideoAsset | null) => void;
  setYoutubeUrl: (url: string) => void;
  setProjectTitle: (title: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setGenre: (genre: string) => void;
  toggleClipDuration: (seconds: number) => void;
  setEnableAutoHook: (value: boolean) => void;
  setSkipSlicing: (value: boolean) => void;
  setEnableCaption: (value: boolean) => void;
  setEnableEmoji: (value: boolean) => void;
  setEnableWatermark: (value: boolean) => void;
  setAspectRatio: (ratio: string) => void;
  resetDraft: () => void;
}

const initialDraft = {
  sourceType: 'local' as SourceType,
  videoAsset: null,
  youtubeUrl: '',
  projectTitle: '',
  customPrompt: '',
  genre: 'Auto',
  clipDurations: [30],
  enableAutoHook: true,
  skipSlicing: false,
  enableCaption: true,
  enableEmoji: true,
  enableWatermark: false,
  aspectRatio: '9:16',
};

export const useDraftStore = create<DraftState>((set) => ({
  ...initialDraft,

  setSourceType: (sourceType) => set({ sourceType }),
  setVideoAsset: (videoAsset) => set({ videoAsset }),
  setYoutubeUrl: (youtubeUrl) => set({ youtubeUrl }),
  setProjectTitle: (projectTitle) => set({ projectTitle }),
  setCustomPrompt: (customPrompt) => set({ customPrompt }),
  setGenre: (genre) => set({ genre }),
  toggleClipDuration: (seconds) =>
    set((state) => ({
      clipDurations: state.clipDurations.includes(seconds)
        ? state.clipDurations.filter((d) => d !== seconds)
        : [...state.clipDurations, seconds].sort((a, b) => a - b),
    })),
  setEnableAutoHook: (enableAutoHook) => set({ enableAutoHook }),
  setSkipSlicing: (skipSlicing) => set({ skipSlicing }),
  setEnableCaption: (enableCaption) => set({ enableCaption }),
  setEnableEmoji: (enableEmoji) => set({ enableEmoji }),
  setEnableWatermark: (enableWatermark) => set({ enableWatermark }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  resetDraft: () => set({ ...initialDraft }),
}));
