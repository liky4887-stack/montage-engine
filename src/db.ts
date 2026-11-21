import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function initDb(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      sha256 TEXT NOT NULL,
      mime TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(`
    CREATE TABLE IF NOT EXISTS media_probes (
      file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
      probe JSONB NOT NULL
    )`);
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      media_file_id TEXT NOT NULL REFERENCES media_files(id),
      type TEXT NOT NULL,
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INT NOT NULL DEFAULT 0,
      error TEXT,
      output_file_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(`
    CREATE TABLE IF NOT EXISTS plan_overrides (
      media_file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
      overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
