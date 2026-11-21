import path from 'node:path';
import { config } from './config.js';
import { probe, trim, isKilledByAndroid } from './ffmpeg.js';
import { emit } from './sse.js';
import { query } from './db.js';

export type JobType = 'probe' | 'trim_export';

type JobRow = {
  id: string;
  media_file_id: string;
  type: JobType;
  params: { inSec?: number; outSec?: number; crop?: '9:16' | null };
  status: string;
};

let running = false;

// One job at a time by default; Android phones overheat and run out of storage fast.
export function pumpWorker(): void {
  if (running) return;
  running = true;
  void (async () => {
    try {
      for (;;) {
        const rows = await query<JobRow>(
          "SELECT id, media_file_id, type, params FROM jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1"
        );
        if (!rows.length) break;
        const job = rows[0];
        await query("UPDATE jobs SET status = 'running', updated_at = now() WHERE id = $1", [job.id]);
        emit(job.id, 'status', { status: 'running', progress: 0 });
        try {
          const outputId = await runJob(job);
          await query("UPDATE jobs SET status = 'done', progress = 100, output_file_id = $1, updated_at = now() WHERE id = $2", [outputId, job.id]);
          emit(job.id, 'status', { status: 'done', progress: 100, outputFileId: outputId });
        } catch (err) {
          const code = (err as { code?: number }).code;
          const status = isKilledByAndroid(code ?? 0) ? 'killed_by_android' : 'failed';
          const message = err instanceof Error ? err.message : String(err);
          await query('UPDATE jobs SET status = $1, error = $2, updated_at = now() WHERE id = $3', [status, message, job.id]);
          emit(job.id, 'status', { status, error: message });
        }
      }
    } finally {
      running = false;
    }
  })();
}

async function runJob(job: JobRow): Promise<string | null> {
  const files = await query<{ original_name: string }>('SELECT original_name FROM media_files WHERE id = $1', [job.media_file_id]);
  if (!files.length) throw new Error('media file row missing');
  const inputPath = path.join(config.mediaDir, 'uploads', path.basename(files[0].original_name));

  if (job.type === 'probe') {
    const result = await probe(inputPath);
    await query('INSERT INTO media_probes (file_id, probe) VALUES ($1, $2) ON CONFLICT (file_id) DO UPDATE SET probe = $2', [job.media_file_id, JSON.stringify(result.raw)]);
    emit(job.id, 'progress', { progress: 100 });
    return null;
  }

  if (job.type === 'trim_export') {
    const { inSec = 0, outSec = 0, crop = null } = job.params;
    if (outSec <= inSec) throw new Error('invalid trim range');
    const outputId = crypto.randomUUID();
    const outputPath = path.join(config.mediaDir, 'uploads', `${outputId}.mp4`);
    emit(job.id, 'progress', { progress: 10 });
    const result = await trim(inputPath, outputPath, { inSec, outSec, crop });
    if (!result.verified) throw new Error(`output verification failed: expected ${result.expectedDuration}s got ${result.probe.durationSec}s`);
    emit(job.id, 'progress', { progress: 90 });
    await query('INSERT INTO media_files (id, original_name, size_bytes, sha256, mime) VALUES ($1, $2, $3, $4, $5)', [
      outputId, `${outputId}.mp4`, 0, 'pending', 'video/mp4',
    ]);
    await query('INSERT INTO media_probes (file_id, probe) VALUES ($1, $2) ON CONFLICT (file_id) DO UPDATE SET probe = $2', [outputId, JSON.stringify(result.probe.raw)]);
    return outputId;
  }

  throw new Error(`unknown job type: ${job.type}`);
}

export async function freeStorageBytes(): Promise<number | null> {
  try {
    const fs = await import('node:fs');
    const stats = fs.statfsSync(config.mediaDir);
    return stats.bavail * stats.bsize;
  } catch {
    return null;
  }
}
