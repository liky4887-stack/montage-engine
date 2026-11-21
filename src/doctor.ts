import { config } from './config.js';
import { ffmpegAvailable } from './ffmpeg.js';
import { freeStorageBytes } from './worker.js';

export type Check = {
  name: string;
  status: 'ok' | 'missing' | 'too_slow' | 'manual_mode';
  detail: string;
};

export async function runDoctor(): Promise<Check[]> {
  const checks: Check[] = [];

  const ffmpegVersion = await ffmpegAvailable();
  checks.push({
    name: 'ffmpeg',
    status: ffmpegVersion ? 'ok' : 'missing',
    detail: ffmpegVersion ? `version ${ffmpegVersion}` : 'install with: pkg install ffmpeg',
  });

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({
    name: 'node',
    status: nodeMajor >= 22 ? 'ok' : 'too_slow',
    detail: `Node ${process.versions.node}; HyperFrames-style rendering needs 22+`,
  });

  const free = await freeStorageBytes();
  checks.push({
    name: 'free-storage',
    status: free === null ? 'missing' : free >= config.minFreeBytes ? 'ok' : 'too_slow',
    detail: free === null ? 'could not stat media dir' : `${(free / 1024 ** 3).toFixed(2)} GB free (minimum 2 GB)`,
  });

  checks.push({
    name: 'whisper.cpp',
    status: 'missing',
    detail: 'built by scripts/termux-setup.sh; benchmark runs after first build',
  });
  checks.push({
    name: 'codex-cli',
    status: 'missing',
    detail: 'install the Termux Codex fork and run codex login; until then manual mode is used',
  });
  checks.push({
    name: 'chromium-headless',
    status: 'missing',
    detail: 'needed for HTML/motion/3D skills; install via pkg if available on your device',
  });

  return checks;
}
