import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { CHECKED_ITEM_RETENTION, HISTORY_RETENTION, cleanupOldData, getSuggestions } from './history';
import { addItems, createList, getItems, setItemChecked } from './lists';
import { migrate } from './schema';

let db: ReturnType<typeof createTestDb>;
let listId: string;

beforeEach(async () => {
	db = createTestDb();
	await migrate(db);
	listId = await createList(db, 'L');
});

const history = (name: string, useCount: number, lastUsedAt: number) =>
	db.raw.prepare('INSERT INTO item_history (name, use_count, last_used_at) VALUES (?, ?, ?)').run(name, useCount, lastUsedAt);

describe('suggestions', () => {
	it('records every added name and counts repeats', async () => {
		await addItems(db, listId, [{ name: 'Milch', quantityInfo: null }]);
		await addItems(db, listId, [{ name: 'Milch', quantityInfo: '2x' }]);
		expect(db.raw.prepare('SELECT name, use_count FROM item_history').all()).toEqual([{ name: 'Milch', use_count: 2 }]);
	});

	it('ranks prefix matches first, then recent, then frequent (same as the server)', async () => {
		history('Hafermilch', 9, 300);
		history('Milchreis', 1, 100);
		history('Milch', 5, 200); // exact match: never suggested
		history('Kokosmilch', 2, 400);
		expect(await getSuggestions(db, 'milch')).toEqual(['Milchreis', 'Kokosmilch', 'Hafermilch']);
	});

	it('without a query returns the most recent names', async () => {
		history('A', 1, 1);
		history('B', 1, 3);
		history('C', 1, 2);
		expect(await getSuggestions(db, '  ', 2)).toEqual(['B', 'C']);
	});
});

describe('cleanupOldData', () => {
	it('drops old checked items and stale suggestions, keeps the rest', async () => {
		const at = 1_000_000_000;
		await addItems(db, listId, [
			{ name: 'Old', quantityInfo: null },
			{ name: 'Recent', quantityInfo: null },
			{ name: 'Open', quantityInfo: null }
		]);
		for (const item of await getItems(db, listId)) if (item.name !== 'Open') await setItemChecked(db, item, true);
		db.raw.prepare("UPDATE items SET checked_at = ? WHERE name = 'Old'").run(at - CHECKED_ITEM_RETENTION - 1);
		db.raw.prepare("UPDATE items SET checked_at = ? WHERE name = 'Recent'").run(at - 10);
		db.raw.exec('DELETE FROM item_history');
		history('Stale', 3, at - HISTORY_RETENTION - 1);
		history('Fresh', 1, at - 10);

		await cleanupOldData(db, at);

		expect((await getItems(db, listId)).map((i) => i.name).sort()).toEqual(['Open', 'Recent']);
		expect(await getSuggestions(db, '')).toEqual(['Fresh']);
	});
});
