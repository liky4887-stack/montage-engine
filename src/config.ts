import path from 'node:path';
import fs from 'node:fs';

function num(name: string, def: number): number {
  const v = process.env[name];
  return v ? Number(v) : def;
}

export const config = {
  port: num('PORT', 8787),
  host: process.env.HOST ?? '127.0.0.1',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://localhost/clipforge?host=/data/data/com.termux/files/usr/var/run/postgresql',
  mediaDir: path.resolve(process.env.MEDIA_DIR ?? './media'),
  maxUploadBytes: num('MAX_UPLOAD_BYTES', 2 * 1024 ** 3),
  chunkSize: num('CHUNK_SIZE', 5 * 1024 ** 2),
  minFreeBytes: num('MIN_FREE_BYTES', 2 * 1024 ** 3),
  accessTokenTtlMs: 60 * 60 * 1000,
  refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
  pairingAttemptsPerMinute: 5,
};

export function ensureMediaDir(): void {
  fs.mkdirSync(path.join(config.mediaDir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(config.mediaDir, 'jobs'), { recursive: true });
}
