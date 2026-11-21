export interface CurationPref {
  clipDurations: number[][];
  customPrompt: string;
  genre: string;
  model: string;
  skipCurate: boolean;
  skipSlicing: boolean;
  topicKeywords: string[];
  enableAutoHook: boolean;
  range: unknown | null;
  activeLang: string | null;
  narratives: unknown | null;
}

export interface ImportPref {
  sourceLang: string;
}

export interface RenderPref {
  layoutAspectRatio: string;
  enableWatermark: boolean;
  enableCaption: boolean;
  enableEmoji: boolean;
}

export interface UploadedVideoAttr {
  title: string;
  durationMs: number;
}

export interface CreateProjectRequest {
  videoUrl: string;
  brandTemplateId: string | null;
  curationPref: CurationPref;
  importPref: ImportPref;
  renderPref: RenderPref;
  uploadedVideoAttr: UploadedVideoAttr;
}

export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

export interface ClipProject {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  durationMs?: number;
  aspectRatio?: string;
}

export type StageStatus = 'pending' | 'active' | 'completed';

export interface ProgressStage {
  key: string;
  label: string;
  status: StageStatus;
}

export interface ProgressResponse {
  projectId: string;
  status: ProjectStatus;
  progress: number;
  currentStage?: string;
  stages: ProgressStage[];
}

export interface ExportableClip {
  id: string;
  projectId: string;
  title: string;
  bio?: string;
  viralityScore: number;
  durationMs: number;
  thumbnailUrl?: string | null;
  videoUrl: string;
  shareUrl?: string | null;
}

export interface SourceVideoPreflightRequest {
  sourceUrl: string;
  sourceType: 'local' | 'youtube';
  title: string;
  durationMs: number;
}

export interface SourceVideoPreflightResponse {
  videoId: string;
  status?: string;
}

export interface UploadLinkRequest {
  videoId: string;
  fileName: string;
  contentType: string;
}

export interface UploadLinkResponse {
  uploadUrl: string;
  videoUrl?: string;
}

export interface ProcessingError extends Error {
  statusCode?: number;
}
