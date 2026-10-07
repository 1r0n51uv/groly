import { isValidCategoryKey } from '$lib/categories';
import {
	getCategoryPreferenceAction,
	normalizeCategoryPreferenceName,
	resolveCategoryOverrideForCreate
} from '$lib/categoryPreferences';
import { newId, now, type Db } from './core';

export type List = {
	id: string;
	name: string;
	iconId: string | null;
	openCount: number;
	updatedAt: number;
};

export type Item = {
	id: string;
	listId: string;
	name: string;
	quantityInfo: string | null;
	isChecked: boolean;
	checkedAt: number | null;
	categoryOverride: string | null;
	createdAt: number;
	updatedAt: number;
};

/** An item to add; `categoryOverride` comes from a favourite and beats the learned category. */
export type NewItem = { name: string; quantityInfo: string | null; categoryOverride?: string | null };

type ItemRow = Omit<Item, 'isChecked'> & { isChecked: number };

const LIST_COLUMNS = `l.id, l.name, l.icon_id AS iconId, l.updated_at AS updatedAt,
	(SELECT COUNT(*) FROM items i WHERE i.list_id = l.id AND i.is_checked = 0) AS openCount`;

export async function getLists(db: Db): Promise<List[]> {
	return db.getAllAsync<List>(`SELECT ${LIST_COLUMNS} FROM lists l ORDER BY l.updated_at DESC`);
}

export async function getList(db: Db, id: string): Promise<List | null> {
	return db.getFirstAsync<List>(`SELECT ${LIST_COLUMNS} FROM lists l WHERE l.id = ?`, id);
}

export async function createList(db: Db, name: string): Promise<string> {
	const id = newId();
	const ts = now();
	await db.runAsync('INSERT INTO lists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', id, name, ts, ts);
	return id;
}

export async function renameList(db: Db, id: string, name: string) {
	await db.runAsync('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?', name.trim(), now(), id);
}

export async function setListIcon(db: Db, id: string, iconId: string | null) {
	await db.runAsync('UPDATE lists SET icon_id = ?, updated_at = ? WHERE id = ?', iconId, now(), id);
}

export async function deleteList(db: Db, id: string) {
	// Delete items explicitly: SQLite only enforces ON DELETE CASCADE with PRAGMA foreign_keys = ON
	await db.withTransactionAsync(async () => {
		await db.runAsync('DELETE FROM items WHERE list_id = ?', id);
		await db.runAsync('DELETE FROM lists WHERE id = ?', id);
	});
}

export async function getItems(db: Db, listId: string): Promise<Item[]> {
	const rows = await db.getAllAsync<ItemRow>(
		`SELECT id, list_id AS listId, name, quantity_info AS quantityInfo, is_checked AS isChecked,
			checked_at AS checkedAt, category_override AS categoryOverride,
			created_at AS createdAt, updated_at AS updatedAt
		FROM items WHERE list_id = ?`,
		listId
	);
	return rows.map((r) => ({ ...r, isChecked: r.isChecked === 1 }));
}

export async function getItem(db: Db, id: string): Promise<Item | null> {
	const row = await db.getFirstAsync<ItemRow>(
		`SELECT id, list_id AS listId, name, quantity_info AS quantityInfo, is_checked AS isChecked,
			checked_at AS checkedAt, category_override AS categoryOverride,
			created_at AS createdAt, updated_at AS updatedAt
		FROM items WHERE id = ?`,
		id
	);
	return row ? { ...row, isChecked: row.isChecked === 1 } : null;
}

async function categoryPreferenceMap(db: Db): Promise<Map<string, string>> {
	const rows = await db.getAllAsync<{ normalized_name: string; category_override: string }>(
		'SELECT normalized_name, category_override FROM category_preferences'
	);
	return new Map(rows.map((r) => [r.normalized_name, r.category_override]));
}

export async function addItems(db: Db, listId: string, entries: NewItem[]) {
	const ts = now();
	const preferences = await categoryPreferenceMap(db);
	await db.withTransactionAsync(async () => {
		for (const entry of entries) {
			const name = entry.name.trim();
			if (!name) continue;
			// Same rule as the server: favourite's category, else the category last picked for this name
			const categoryOverride = resolveCategoryOverrideForCreate(name, entry.categoryOverride, preferences);
			await db.runAsync(
				`INSERT INTO items (id, list_id, name, quantity_info, category_override, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				newId(), listId, name, entry.quantityInfo?.trim() || null, categoryOverride, ts, ts
			);
			await db.runAsync(
				`INSERT INTO item_history (name, use_count, last_used_at) VALUES (?, 1, ?)
				ON CONFLICT(name) DO UPDATE SET use_count = use_count + 1, last_used_at = excluded.last_used_at`,
				name, ts
			);
		}
		await touchList(db, listId, ts);
	});
}

export type ItemChanges = {
	name?: string;
	quantityInfo?: string | null;
	categoryOverride?: string | null;
	/** True when the user picked a category (or "automatic"): the choice is remembered for this name */
	categoryPickerUsed?: boolean;
};

export async function updateItem(db: Db, item: Item, changes: ItemChanges) {
	const ts = now();
	const name = changes.name?.trim() || item.name;
	const quantityInfo = changes.quantityInfo === undefined ? item.quantityInfo : changes.quantityInfo?.trim() || null;
	let categoryOverride = item.categoryOverride;
	if (changes.categoryOverride !== undefined) {
		if (changes.categoryOverride !== null && !isValidCategoryKey(changes.categoryOverride)) {
			throw new Error(`Invalid category: ${changes.categoryOverride}`);
		}
		categoryOverride = changes.categoryOverride;
	}

	await db.withTransactionAsync(async () => {
		await db.runAsync(
			'UPDATE items SET name = ?, quantity_info = ?, category_override = ?, updated_at = ? WHERE id = ?',
			name, quantityInfo, categoryOverride, ts, item.id
		);
		const action = getCategoryPreferenceAction(changes.categoryPickerUsed ?? false, changes.categoryOverride);
		const normalizedName = normalizeCategoryPreferenceName(name);
		if (action.type === 'set' && normalizedName) {
			await db.runAsync(
				`INSERT INTO category_preferences (normalized_name, category_override, updated_at) VALUES (?, ?, ?)
				ON CONFLICT(normalized_name) DO UPDATE SET category_override = excluded.category_override, updated_at = excluded.updated_at`,
				normalizedName, action.categoryOverride, ts
			);
		} else if (action.type === 'delete' && normalizedName) {
			await db.runAsync('DELETE FROM category_preferences WHERE normalized_name = ?', normalizedName);
		}
		await touchList(db, item.listId, ts);
	});
}

export async function setItemChecked(db: Db, item: Item, isChecked: boolean) {
	const ts = now();
	await db.withTransactionAsync(async () => {
		await db.runAsync(
			'UPDATE items SET is_checked = ?, checked_at = ?, updated_at = ? WHERE id = ?',
			isChecked ? 1 : 0, isChecked ? ts : null, ts, item.id
		);
		await touchList(db, item.listId, ts);
	});
}

export async function deleteItem(db: Db, item: Item) {
	await db.withTransactionAsync(async () => {
		await db.runAsync('DELETE FROM items WHERE id = ?', item.id);
		await touchList(db, item.listId, now());
	});
}

/** Deletes all checked items of a list; returns how many were removed. */
export async function clearCheckedItems(db: Db, listId: string): Promise<number> {
	let removed = 0;
	await db.withTransactionAsync(async () => {
		removed = (await db.runAsync('DELETE FROM items WHERE list_id = ? AND is_checked = 1', listId)).changes;
		if (removed > 0) await touchList(db, listId, now());
	});
	return removed;
}

function touchList(db: Db, listId: string, ts: number) {
	return db.runAsync('UPDATE lists SET updated_at = ? WHERE id = ?', ts, listId);
}
