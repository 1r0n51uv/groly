import { now, type Db } from './core';

const DAY = 24 * 60 * 60;
// Same retention as the server (src/lib/server/cleanup.ts)
export const CHECKED_ITEM_RETENTION = 60 * DAY;
export const HISTORY_RETENTION = 6 * 30 * DAY;

/**
 * Names previously added, for the add bar. Same ranking as the server (itemSuggestions.ts):
 * names starting with the query first, then most recently used, then most used.
 */
export async function getSuggestions(db: Db, rawQuery: string, limit = 8): Promise<string[]> {
	const query = rawQuery.trim().toLowerCase();
	const rows = query
		? await db.getAllAsync<{ name: string }>(
				`SELECT name FROM item_history
				WHERE instr(lower(name), ?) > 0 AND lower(name) <> ?
				ORDER BY CASE WHEN instr(lower(name), ?) = 1 THEN 0 ELSE 1 END, last_used_at DESC, use_count DESC, name ASC
				LIMIT ?`,
				query, query, query, limit
			)
		: await db.getAllAsync<{ name: string }>(
				'SELECT name FROM item_history ORDER BY last_used_at DESC, use_count DESC, name ASC LIMIT ?',
				limit
			);
	return rows.map((r) => r.name);
}

/** Drops checked items older than 60 days and suggestions unused for 6 months. Run at app start. */
export async function cleanupOldData(db: Db, at = now()) {
	await db.runAsync('DELETE FROM items WHERE is_checked = 1 AND checked_at < ?', at - CHECKED_ITEM_RETENTION);
	await db.runAsync('DELETE FROM item_history WHERE last_used_at < ?', at - HISTORY_RETENTION);
}
