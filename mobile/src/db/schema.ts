import { type Db } from './core';

// Append a step for every schema change and never edit one that has shipped:
// installed apps only run the steps above their stored version.
export const MIGRATIONS: string[] = [
	// 1: lists and items
	`CREATE TABLE lists (
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
	CREATE TABLE items (
		id TEXT PRIMARY KEY NOT NULL,
		list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		quantity_info TEXT,
		is_checked INTEGER NOT NULL DEFAULT 0,
		checked_at INTEGER,
		category_override TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
	CREATE INDEX items_list_id ON items(list_id);`,
	// 2: server-aligned list columns, settings in the server's users.settings JSON format
	`ALTER TABLE lists ADD COLUMN description TEXT;
	ALTER TABLE lists ADD COLUMN icon_id TEXT;
	CREATE TABLE user_settings (
		id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
		settings TEXT NOT NULL,
		settings_revision INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL
	);`,
	// 3: learned categories, suggestion history, favourites (server tables without user_id: one user per device)
	`CREATE TABLE category_preferences (
		normalized_name TEXT PRIMARY KEY NOT NULL,
		category_override TEXT NOT NULL,
		updated_at INTEGER NOT NULL
	);
	CREATE TABLE item_history (
		name TEXT PRIMARY KEY NOT NULL,
		use_count INTEGER NOT NULL DEFAULT 1,
		last_used_at INTEGER NOT NULL
	);
	CREATE TABLE favorites (
		name TEXT PRIMARY KEY NOT NULL,
		quantity_info TEXT,
		category_override TEXT,
		created_at INTEGER NOT NULL
	);`
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: Db) {
	const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
	const version = row?.user_version ?? 0;
	if (version >= SCHEMA_VERSION) return;

	if (version === 0) await db.execAsync(`PRAGMA journal_mode = 'wal';`);
	for (let v = version; v < SCHEMA_VERSION; v++) {
		await db.withTransactionAsync(async () => {
			await db.execAsync(MIGRATIONS[v]);
			await db.execAsync(`PRAGMA user_version = ${v + 1}`);
		});
	}
}
