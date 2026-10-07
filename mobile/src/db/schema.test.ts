import { describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { MIGRATIONS, SCHEMA_VERSION, migrate } from './schema';

async function version(db: ReturnType<typeof createTestDb>) {
	return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))!.user_version;
}

/** A database as an installed app at `v` left it */
async function dbAtVersion(v: number) {
	const db = createTestDb();
	for (let i = 0; i < v; i++) db.raw.exec(MIGRATIONS[i]);
	db.raw.exec(`PRAGMA user_version = ${v}`);
	return db;
}

describe('migrate', () => {
	it('creates the latest schema on a fresh install', async () => {
		const db = createTestDb();
		await migrate(db);
		expect(await version(db)).toBe(SCHEMA_VERSION);
		const tables = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")).map((t) => t.name);
		expect(tables).toEqual(expect.arrayContaining(['lists', 'items', 'user_settings']));
	});

	it('is a no-op when already up to date', async () => {
		const db = createTestDb();
		await migrate(db);
		await migrate(db);
		expect(await version(db)).toBe(SCHEMA_VERSION);
	});

	// Every past version must upgrade without losing data: installed apps only ever move forward
	for (let from = 1; from < SCHEMA_VERSION; from++) {
		it(`upgrades a v${from} database and keeps its data`, async () => {
			const db = await dbAtVersion(from);
			db.raw.exec(`
				INSERT INTO lists (id, name, created_at, updated_at) VALUES ('l1', 'Groceries', 1, 2);
				INSERT INTO items (id, list_id, name, quantity_info, is_checked, created_at, updated_at)
					VALUES ('i1', 'l1', 'Milch', '2x', 1, 3, 4);
			`);
			await migrate(db);

			expect(await version(db)).toBe(SCHEMA_VERSION);
			expect(await db.getFirstAsync('SELECT id, name, created_at, updated_at FROM lists')).toEqual({
				id: 'l1', name: 'Groceries', created_at: 1, updated_at: 2
			});
			expect(await db.getFirstAsync('SELECT id, list_id, name, quantity_info, is_checked FROM items')).toEqual({
				id: 'i1', list_id: 'l1', name: 'Milch', quantity_info: '2x', is_checked: 1
			});
		});
	}

	it('rolls back a failing step and keeps the old version', async () => {
		const db = await dbAtVersion(1);
		db.raw.exec('CREATE TABLE user_settings (id INTEGER)'); // makes step 2 fail
		await expect(migrate(db)).rejects.toThrow();
		expect(await version(db)).toBe(1);
		const columns = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(lists)')).map((c) => c.name);
		expect(columns).not.toContain('description');
	});
});
