import 'dotenv/config';
import fastify from 'fastify';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config, ensureMediaDir } from './config.js';
import { initDb, query, closeDb } from './db.js';
import {
  newPairingCode, getPairingCode, allowPairingAttempt, pair, refresh, verifyAccessToken, redact,
} from './auth.js';
import { probe, sha256File } from './ffmpeg.js';
import { runDoctor } from './doctor.js';
import { pumpWorker, freeStorageBytes } from './worker.js';
import { subscribe } from './sse.js';
import { validateEditPlan } from './schemas.js';

ensureMediaDir();
const app = fastify({ logger: { redact: { paths: ['req.headers.authorization', 'req.headers.cookie'] } } });

app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health' || req.url.startsWith('/pair')) return;
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!verifyAccessToken(token)) {
    await reply.code(401).send({ error: 'unpaired: enter the pairing code from Termux first' });
  }
});

app.get('/health', async () => ({ ok: true }));

app.post('/pair', async (req, reply) => {
  if (!allowPairingAttempt()) return reply.code(429).send({ error: 'too many pairing attempts, wait a minute' });
  const code = String((req.body as { code?: string } | null)?.code ?? '');
  const result = pair(code);
  if (!result) return reply.code(403).send({ error: 'wrong pairing code' });
  return result;
});

app.post('/pair/refresh', async (req, reply) => {
  const token = (req.body as { refreshToken?: string } | null)?.refreshToken;
  const access = token ? refresh(token) : null;
  if (!access) return reply.code(403).send({ error: 'refresh rejected' });
  return { accessToken: access };
});

app.get('/pairing-code', async () => {
  // The code lives in Termux; this endpoint rotates it for the same-user flow.
  return { code: getPairingCode() ?? newPairingCode() };
});

app.get('/capabilities', async () => {
  const checks = await runDoctor();
  return { checks, oneJobAtATime: true, chunkSize: config.chunkSize };
});

app.post('/uploads', async (req, reply) => {
  const body = req.body as {
    fileName?: string;
    mime?: string;
    totalBytes?: number;
    chunkIndex?: number;
    totalChunks?: number;
    dataBase64?: string;
  };
  const { fileName, mime, totalBytes, chunkIndex, totalChunks, dataBase64 } = body;
  if (!fileName || !mime?.startsWith('video/') || !totalBytes || chunkIndex === undefined || !totalChunks || !dataBase64) {
    return reply.code(400).send({ error: 'fileName, mime (video/*), totalBytes, chunkIndex, totalChunks, dataBase64 required' });
  }
  if (totalBytes > config.maxUploadBytes) return reply.code(413).send({ error: 'file too large' });
  const free = await freeStorageBytes();
  if (free !== null && free < config.minFreeBytes) return reply.code(507).send({ error: 'less than 2 GB free; free space before new jobs' });

  const safeName = path.basename(fileName).replace(/[^A-Za-z0-9._-]/g, '_');
  const tempPath = path.join(config.mediaDir, 'uploads', `${safeName}.part`);
  if (chunkIndex === 0 && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  fs.appendFileSync(tempPath, Buffer.from(dataBase64, 'base64'));
  if (chunkIndex === totalChunks - 1) {
    const finalPath = path.join(config.mediaDir, 'uploads', safeName);
    fs.renameSync(tempPath, finalPath);
    const id = crypto.randomUUID();
    const hash = await sha256File(finalPath);
    await query('INSERT INTO media_files (id, original_name, size_bytes, sha256, mime) VALUES ($1, $2, $3, $4, $5)', [
      id, safeName, fs.statSync(finalPath).size, hash, mime,
    ]);
    try {
      const result = await probe(finalPath);
      await query('INSERT INTO media_probes (file_id, probe) VALUES ($1, $2) ON CONFLICT (file_id) DO UPDATE SET probe = $2', [id, JSON.stringify(result.raw)]);
    } catch {
      // probe runs again as a job if ffmpeg is busy
      await query("INSERT INTO jobs (id, media_file_id, type) VALUES ($1, $2, 'probe')", [crypto.randomUUID(), id]);
      pumpWorker();
    }
    return { fileId: id, sha256: hash };
  }
  return { received: chunkIndex + 1, of: totalChunks };
});

app.get('/files', async () => {
  return query('SELECT id, original_name, size_bytes, mime, created_at FROM media_files ORDER BY created_at DESC');
});

app.get('/files/:id/probe', async (req, reply) => {
  const { id } = req.params as { id: string };
  const rows = await query<{ probe: unknown }>('SELECT probe FROM media_probes WHERE file_id = $1', [id]);
  if (!rows.length) return reply.code(404).send({ error: 'no probe yet' });
  return rows[0].probe;
});

app.post('/jobs', async (req, reply) => {
  const body = req.body as { fileId?: string; type?: string; params?: Record<string, unknown> };
  const { fileId, type } = body;
  if (!fileId || !type) return reply.code(400).send({ error: 'fileId and type required' });
  if (!['probe', 'trim_export'].includes(type)) return reply.code(400).send({ error: 'unknown job type for phase 1' });
  const free = await freeStorageBytes();
  if (free !== null && free < config.minFreeBytes) return reply.code(507).send({ error: 'less than 2 GB free' });
  const id = crypto.randomUUID();
  await query('INSERT INTO jobs (id, media_file_id, type, params) VALUES ($1, $2, $3, $4)', [id, fileId, type, JSON.stringify(body.params ?? {})]);
  pumpWorker();
  return { jobId: id };
});

app.get('/jobs/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const rows = await query<Record<string, unknown>>('SELECT id, type, status, progress, error, output_file_id FROM jobs WHERE id = $1', [id]);
  if (!rows.length) return reply.code(404).send({ error: 'job not found' });
  return rows[0];
});

app.get('/jobs/:id/events', async (req, reply) => {
  const { id } = req.params as { id: string };
  const unsubscribe = subscribe(id, reply);
  req.raw.on('close', unsubscribe);
});

app.get('/download/:fileId', async (req, reply) => {
  const { fileId } = req.params as { fileId: string };
  const rows = await query<{ original_name: string }>('SELECT original_name FROM media_files WHERE id = $1', [fileId]);
  if (!rows.length) return reply.code(404).send({ error: 'file not found' });
  const filePath = path.join(config.mediaDir, 'uploads', path.basename(rows[0].original_name));
  if (!fs.existsSync(filePath)) return reply.code(404).send({ error: 'file missing on engine' });
  return reply.type('video/mp4').send(fs.createReadStream(filePath));
});

app.post('/plans/validate', async (req, reply) => {
  const raw = req.body as unknown;
  const fileRows = await query<{ id: string }>('SELECT id FROM media_files');
  const known = fileRows.map((r) => r.id);
  const durations: Record<string, number> = {};
  for (const row of await query<{ file_id: string; probe: { format?: { duration?: string } } }>(
    'SELECT mp.file_id, mp.probe FROM media_probes mp JOIN media_files mf ON mf.id = mp.file_id'
  )) {
    durations[row.file_id] = Number(row.probe?.format?.duration ?? 0);
  }
  const result = validateEditPlan(raw, { knownFileIds: known, durations, maxDuration: 600 });
  if (!result.ok) return reply.code(422).send({ ok: false, errors: result.errors });
  return { ok: true, plan: result.plan };
});

app.put('/files/:id/overrides', async (req, reply) => {
  const { id } = req.params as { id: string };
  const overrides = (req.body as { overrides?: unknown[] } | null)?.overrides;
  if (!Array.isArray(overrides)) return reply.code(400).send({ error: 'overrides array required' });
  await query(
    'INSERT INTO plan_overrides (media_file_id, overrides) VALUES ($1, $2) ON CONFLICT (media_file_id) DO UPDATE SET overrides = $2, updated_at = now()',
    [id, JSON.stringify(overrides)]
  );
  return { saved: true };
});

app.get('/files/:id/overrides', async (req, reply) => {
  const { id } = req.params as { id: string };
  const rows = await query<{ overrides: unknown[] }>('SELECT overrides FROM plan_overrides WHERE media_file_id = $1', [id]);
  return { overrides: rows[0]?.overrides ?? [] };
});

app.setErrorHandler((err: { statusCode?: number; message?: string }, _req, reply) => {
  const message = typeof err?.message === 'string' ? err.message : 'engine error';
  app.log.error(redact(message));
  reply.code(err.statusCode ?? 500).send({ error: 'engine error' });
});

const start = async () => {
  await initDb();
  await app.listen({ port: config.port, host: config.host });
  app.log.warn(`ClipForge engine on http://${config.host}:${config.port} — pairing code: ${newPairingCode()}`);
};

process.on('SIGINT', async () => {
  await closeDb();
  process.exit(0);
});
void start();
