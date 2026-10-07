import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

// Sync readiness (a future sync with a Groly server must stay possible):
// - Table and column names mirror the server schema (src/lib/db/schema.ts), snake_case.
// - IDs are 32 hex chars: unique across devices and within the server's 32-char client-ID limit.
// - Timestamps are Unix seconds, like the server's `now()`.
// - Every write bumps `updated_at`, so changes can later be found by timestamp.

/** The subset of expo-sqlite's API the data layer uses; tests provide it over better-sqlite3. */
export type Db = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'withTransactionAsync'>;

export const now = () => Math.floor(Date.now() / 1000);
export const newId = () => randomUUID().replace(/-/g, '');
