import { env } from 'cloudflare:workers';

export function sessionDatabase(): D1Database {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error('Session database unavailable');
  return db;
}
