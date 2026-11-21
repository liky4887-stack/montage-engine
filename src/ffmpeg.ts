import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ProbeResult = {
  durationSec: number;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  fps: number | null;
  raw: unknown;
};

export function run(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = opts.timeoutMs ? setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs) : null;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
    child.on('error', () => resolve({ code: -1, stdout, stderr }));
  });
}

export async function ffmpegAvailable(): Promise<string | null> {
  const r = await run('ffmpeg', ['-version'], { timeoutMs: 10_000 });
  if (r.code !== 0) return null;
  const m = r.stdout.match(/ffmpeg version (\S+)/);
  return m ? m[1] : 'unknown';
}

// "Killed by Android" surfaces as signal 9 (exit code 137 / SIGKILL).
export function isKilledByAndroid(code: number): boolean {
  return code === 137 || code === 9;
}

export async function probe(filePath: string): Promise<ProbeResult> {
  const r = await run(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { timeoutMs: 30_000 }
  );
  if (r.code !== 0) throw new Error(`ffprobe failed: ${r.stderr.slice(0, 300)}`);
  const raw = JSON.parse(r.stdout) as {
    format?: { duration?: string };
    streams?: Array<Record<string, unknown>>;
  };
  const video = raw.streams?.find((s) => s.codec_type === 'video');
  const audio = raw.streams?.find((s) => s.codec_type === 'audio');
  return {
    durationSec: Number(raw.format?.duration ?? 0),
    width: typeof video?.width === 'number' ? video.width : null,
    height: typeof video?.height === 'number' ? video.height : null,
    videoCodec: typeof video?.codec_name === 'string' ? video.codec_name : null,
    audioCodec: typeof audio?.codec_name === 'string' ? audio.codec_name : null,
    fps: typeof video?.r_frame_rate === 'string' ? evalFps(video.r_frame_rate) : null,
    raw,
  };
}

function evalFps(rate: string): number | null {
  const [num, den] = rate.split('/');
  const n = Number(num);
  const d = den !== undefined ? Number(den) : 1;
  return d && Number.isFinite(n) ? Math.round((n / d) * 100) / 100 : null;
}

export type TrimParams = { inSec: number; outSec: number; crop?: '9:16' | null };

// probe -> edit -> re-probe and verify, so a broken output never looks like success.
export async function trim(inputPath: string, outputPath: string, params: TrimParams): Promise<{ verified: boolean; probe: ProbeResult; expectedDuration: number }> {
  const args = ['-y', '-ss', String(params.inSec), '-to', String(params.outSec), '-i', inputPath];
  if (params.crop === '9:16') args.push('-vf', 'crop=ih*9/16:ih');
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', outputPath);
  const r = await run('ffmpeg', args, { timeoutMs: 30 * 60_000 });
  if (r.code !== 0) {
    const err = new Error(`ffmpeg trim failed (code ${r.code}): ${r.stderr.slice(-300)}`) as Error & { code?: number };
    err.code = r.code;
    throw err;
  }
  const after = await probe(outputPath);
  const expectedDuration = params.outSec - params.inSec;
  return { verified: Math.abs(after.durationSec - expectedDuration) < 1.0, probe: after, expectedDuration };
}

export async function makeThumbnail(inputPath: string, atSec: number, outputPath: string): Promise<void> {
  const r = await run('ffmpeg', ['-y', '-ss', String(atSec), '-i', inputPath, '-frames:v', '1', outputPath], {
    timeoutMs: 60_000,
  });
  if (r.code !== 0) throw new Error(`thumbnail failed: ${r.stderr.slice(-200)}`);
}

export async function makeContactSheet(inputPath: string, outputPath: string, cols = 4): Promise<void> {
  const r = await run(
    'ffmpeg',
    ['-y', '-i', inputPath, '-vf', `fps=1/6,scale=320:-1,tile=${cols}x3`, outputPath],
    { timeoutMs: 120_000 }
  );
  if (r.code !== 0) throw new Error(`contact sheet failed: ${r.stderr.slice(-200)}`);
}

export async function sha256File(filePath: string): Promise<string> {
  const crypto = await import('node:crypto');
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function safeJoin(baseDir: string, name: string): string {
  const resolved = path.resolve(baseDir, name);
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) throw new Error('path traversal blocked');
  return resolved;
}
