import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { migrate } from './schema';
import {
	addItems,
	clearCheckedItems,
	createList,
	deleteItem,
	deleteList,
	getItems,
	getList,
	getLists,
	renameList,
	setItemChecked,
	setListIcon,
	updateItem
} from './lists';

let db: ReturnType<typeof createTestDb>;

beforeEach(async () => {
	db = createTestDb();
	await migrate(db);
});

describe('lists', () => {
	it('uses 32-char hex ids, compatible with the server client-id limit', async () => {
		const id = await createList(db, 'Groceries');
		expect(id).toMatch(/^[0-9a-f]{32}$/);
	});

	it('counts only open items', async () => {
		const id = await createList(db, 'Groceries');
		await addItems(db, id, [
			{ name: 'Milch', quantityInfo: '2x' },
			{ name: 'Brot', quantityInfo: null }
		]);
		const [milk] = (await getItems(db, id)).filter((i) => i.name === 'Milch');
		await setItemChecked(db, milk, true);

		expect(await getLists(db)).toEqual([expect.objectContaining({ id, name: 'Groceries', openCount: 1 })]);
	});

	it('orders lists by last change', async () => {
		const a = await createList(db, 'A');
		const b = await createList(db, 'B');
		db.raw.prepare('UPDATE lists SET updated_at = ? WHERE id = ?').run(100, a);
		db.raw.prepare('UPDATE lists SET updated_at = ? WHERE id = ?').run(50, b);
		expect((await getLists(db)).map((l) => l.name)).toEqual(['A', 'B']);
	});

	it('deleting a list deletes its items', async () => {
		const keep = await createList(db, 'Keep');
		const drop = await createList(db, 'Drop');
		await addItems(db, keep, [{ name: 'Reis', quantityInfo: null }]);
		await addItems(db, drop, [{ name: 'Brot', quantityInfo: null }]);
		await deleteList(db, drop);

		expect((await getLists(db)).map((l) => l.name)).toEqual(['Keep']);
		expect(db.raw.prepare('SELECT COUNT(*) AS n FROM items').get()).toEqual({ n: 1 });
	});
});

describe('items', () => {
	it('stores quantity, checked state and timestamps', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Milch', quantityInfo: '2x' }]);
		const [item] = await getItems(db, id);
		expect(item).toMatchObject({ listId: id, name: 'Milch', quantityInfo: '2x', isChecked: false, checkedAt: null });

		await setItemChecked(db, item, true);
		const [checked] = await getItems(db, id);
		expect(checked.isChecked).toBe(true);
		expect(checked.checkedAt).toBeGreaterThan(0);

		await setItemChecked(db, checked, false);
		expect((await getItems(db, id))[0]).toMatchObject({ isChecked: false, checkedAt: null });
	});

	it('deletes a single item', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'A', quantityInfo: null }, { name: 'B', quantityInfo: null }]);
		const [a] = (await getItems(db, id)).filter((i) => i.name === 'A');
		await deleteItem(db, a);
		expect((await getItems(db, id)).map((i) => i.name)).toEqual(['B']);
	});

	it('bumps the list on every item change (needed for a future sync)', async () => {
		const id = await createList(db, 'L');
		db.raw.prepare('UPDATE lists SET updated_at = 1 WHERE id = ?').run(id);
		await addItems(db, id, [{ name: 'A', quantityInfo: null }]);
		expect((await getLists(db))[0].updatedAt).toBeGreaterThan(1);
	});
});

describe('list management', () => {
	it('renames a list and sets its icon', async () => {
		const id = await createList(db, 'Old');
		await renameList(db, id, '  Weekend  ');
		await setListIcon(db, id, 'bio');
		expect(await getList(db, id)).toMatchObject({ name: 'Weekend', iconId: 'bio' });
		await setListIcon(db, id, null);
		expect((await getList(db, id))!.iconId).toBeNull();
	});

	it('clears only checked items of that list', async () => {
		const a = await createList(db, 'A');
		const b = await createList(db, 'B');
		await addItems(db, a, [{ name: 'Milch', quantityInfo: null }, { name: 'Brot', quantityInfo: null }]);
		await addItems(db, b, [{ name: 'Reis', quantityInfo: null }]);
		await setItemChecked(db, (await getItems(db, a)).find((i) => i.name === 'Milch')!, true);
		await setItemChecked(db, (await getItems(db, b))[0], true);

		expect(await clearCheckedItems(db, a)).toBe(1);
		expect((await getItems(db, a)).map((i) => i.name)).toEqual(['Brot']);
		expect(await getItems(db, b)).toHaveLength(1);
		expect(await clearCheckedItems(db, a)).toBe(0);
	});
});

describe('editing items and learned categories', () => {
	it('edits name and quantity; an empty quantity is cleared', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Milch', quantityInfo: '2x' }]);
		await updateItem(db, (await getItems(db, id))[0], { name: ' Hafermilch ', quantityInfo: ' ' });
		expect((await getItems(db, id))[0]).toMatchObject({ name: 'Hafermilch', quantityInfo: null });
	});

	it('remembers a picked category for the next item with that name, case-insensitively', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null }]);
		await updateItem(db, (await getItems(db, id))[0], { categoryOverride: 'fleisch', categoryPickerUsed: true });

		await addItems(db, id, [{ name: 'TOFU', quantityInfo: null }]);
		expect((await getItems(db, id)).map((i) => i.categoryOverride)).toEqual(['fleisch', 'fleisch']);
	});

	it('choosing "automatic" forgets the learned category', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null }]);
		await updateItem(db, (await getItems(db, id))[0], { categoryOverride: 'fleisch', categoryPickerUsed: true });
		await updateItem(db, (await getItems(db, id))[0], { categoryOverride: null, categoryPickerUsed: true });

		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null }]);
		expect((await getItems(db, id)).every((i) => i.categoryOverride === null)).toBe(true);
	});

	it('does not learn when only name or quantity changed', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null }]);
		await updateItem(db, (await getItems(db, id))[0], { quantityInfo: '2' });
		expect(db.raw.prepare('SELECT COUNT(*) AS n FROM category_preferences').get()).toEqual({ n: 0 });
	});

	it('a category from a favourite beats the learned one', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null }]);
		await updateItem(db, (await getItems(db, id))[0], { categoryOverride: 'fleisch', categoryPickerUsed: true });
		await addItems(db, id, [{ name: 'Tofu', quantityInfo: null, categoryOverride: 'milch' }]);
		expect((await getItems(db, id)).map((i) => i.categoryOverride).sort()).toEqual(['fleisch', 'milch']);
	});

	it('rejects unknown categories', async () => {
		const id = await createList(db, 'L');
		await addItems(db, id, [{ name: 'A', quantityInfo: null }]);
		await expect(updateItem(db, (await getItems(db, id))[0], { categoryOverride: 'nope' })).rejects.toThrow();
	});
});
