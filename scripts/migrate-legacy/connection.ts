import postgres from 'postgres';
import 'dotenv/config';

export function createLegacyClient() {
  const url = process.env.DIRECT_URL_PROD;
  if (!url) throw new Error('DIRECT_URL_PROD env var is required');
  return postgres(url, { max: 1 });
}

export function createTargetClient() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error('DIRECT_URL env var is required');
  return postgres(url, { max: 1 });
}

export type Sql = ReturnType<typeof postgres>;
