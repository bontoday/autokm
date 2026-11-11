import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';

// Detectamos si existe la URL de Supabase en las variables de entorno
const useCloudDB = !!process.env.DATABASE_URL;

const dialect = useCloudDB
  ? new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    })
  : new PostgresDialect({
      // Si no hay URL (ej. en tu PC sin .env), usa la base local PGlite
      pool: new PGlite() as any, 
    });

export const db = new Kysely({ dialect });