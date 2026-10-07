import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { BackupError, createBackup, restoreBackup } from './backup';
import { addItems, createList, getItems, getLists, setItemChecked } from './lists';
import { SCHEMA_VERSION, migrate } from './schema';
import { getSettings, updateSettings } from './settings';

let db: ReturnType<typeof createTestDb>;

async function freshDb() {
	const d = createTestDb();
	await migrate(d);
	return d;
}

beforeEach(async () => {
	db = await freshDb();
});

describe('backup', () => {
	it('round-trips all data into another database', async () => {
		const id = await createList(db, 'Groceries');
		await addItems(db, id, [{ name: 'Milch', quantityInfo: '2x' }, { name: 'Brot', quantityInfo: null }]);
		await setItemChecked(db, (await getItems(db, id))[0], true);
		await updateSettings(db, { lang: 'it', showRecipes: false });

		// Through JSON, like the exported file
		const file = JSON.parse(JSON.stringify(await createBackup(db)));
		const target = await freshDb();
		const counts = await restoreBackup(target, file);

		expect(counts).toEqual({ lists: 1, items: 2, user_settings: 1, category_preferences: 0, item_history: 2, favorites: 0 });
		expect(await getLists(target)).toEqual(await getLists(db));
		expect(await getItems(target, id)).toEqual(await getItems(db, id));
		expect(await getSettings(target)).toEqual(await getSettings(db));
	});

	it('replaces existing data instead of merging', async () => {
		await createList(db, 'Old');
		const source = await freshDb();
		await createList(source, 'New');
		await restoreBackup(db, await createBackup(source));
		expect((await getLists(db)).map((l) => l.name)).toEqual(['New']);
	});

	it('restores a backup from an older schema version', async () => {
		const v1 = {
			app: 'groly', format: 1, schemaVersion: 1, exportedAt: 1,
			tables: {
				lists: [{ id: 'l1', name: 'Old list', created_at: 1, updated_at: 1 }],
				items: [{ id: 'i1', list_id: 'l1', name: 'Milch', quantity_info: null, is_checked: 0, checked_at: null, category_override: null, created_at: 1, updated_at: 1 }]
			}
		};
		await restoreBackup(db, v1);
		expect(await getLists(db)).toEqual([expect.objectContaining({ name: 'Old list', openCount: 1 })]);
	});

	it('rejects a backup from a newer app version', async () => {
		const backup = { ...(await createBackup(db)), schemaVersion: SCHEMA_VERSION + 1 };
		await expect(restoreBackup(db, backup)).rejects.toMatchObject({ code: 'newer' });
	});

	it.each([
		['not an object', 'hello'],
		['another app', { app: 'other', format: 1, schemaVersion: 1, tables: {} }],
		['rows that are not objects', { app: 'groly', format: 1, schemaVersion: 1, tables: { lists: ['x'] } }],
		['nested values', { app: 'groly', format: 1, schemaVersion: 1, tables: { lists: [{ id: { a: 1 } }] } }]
	])('rejects %s', async (_, data) => {
		await expect(restoreBackup(db, data)).rejects.toBeInstanceOf(BackupError);
	});

	it('leaves data untouched when a restore fails half way', async () => {
		await createList(db, 'Keep me');
		const broken = {
			app: 'groly', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 1,
			tables: { lists: [{ id: 'a', name: null, created_at: 1, updated_at: 1 }] } // name is NOT NULL
		};
		await expect(restoreBackup(db, broken)).rejects.toThrow();
		expect((await getLists(db)).map((l) => l.name)).toEqual(['Keep me']);
	});

	it('ignores unknown columns, including ones that look like SQL', async () => {
		const backup = {
			app: 'groly', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 1,
			tables: { lists: [{ id: 'l1', name: 'L', created_at: 1, updated_at: 1, 'x); DROP TABLE items; --': 1, future_column: 'y' }] }
		};
		await restoreBackup(db, backup);
		expect((await getLists(db)).map((l) => l.name)).toEqual(['L']);
		expect(db.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'items'").get()).toBeTruthy();
	});
});
