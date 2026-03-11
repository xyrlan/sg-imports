import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// O Supabase fornece a string de conexão no painel (Transaction Pooler recomendado)
const connectionString = process.env.DATABASE_URL!;

// Para queries em tempo real (Next.js Server Components)
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

/** Transaction client type for use in db.transaction callbacks */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];