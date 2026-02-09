import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Use a porta 5432 (Direct Connection) para migrações!
const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('⏳ Aplicando migrações...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('✅ Banco de dados atualizado com sucesso!');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});