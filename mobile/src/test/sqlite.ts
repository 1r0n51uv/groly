import Database from 'better-sqlite3';
import type { Db } from '@/db';

type Param = string | number | null;

/** In-memory SQLite exposing the slice of expo-sqlite's API the data layer uses. */
export function createTestDb(): Db & { raw: Database.Database } {
	const raw = new Database(':memory:');
	// better-sqlite3 enables foreign keys by default; SQLite on the device (expo-sqlite) doesn't.
	// Match the device, or tests pass thanks to ON DELETE CASCADE that never fires in the app.
	raw.pragma('foreign_keys = OFF');
	const params = (args: unknown[]) => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args) as Param[];

	const db = {
		raw,
		async execAsync(source: string) {
			raw.exec(source);
		},
		async runAsync(source: string, ...args: unknown[]) {
			const res = raw.prepare(source).run(...params(args));
			return { lastInsertRowId: Number(res.lastInsertRowid), changes: res.changes };
		},
		async getAllAsync(source: string, ...args: unknown[]) {
			return raw.prepare(source).all(...params(args));
		},
		async getFirstAsync(source: string, ...args: unknown[]) {
			return raw.prepare(source).get(...params(args)) ?? null;
		},
		async withTransactionAsync(task: () => Promise<void>) {
			raw.exec('BEGIN');
			try {
				await task();
				raw.exec('COMMIT');
			} catch (e) {
				raw.exec('ROLLBACK');
				throw e;
			}
		}
	};
	return db as unknown as Db & { raw: Database.Database };
}
