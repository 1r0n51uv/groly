import { now, type Db } from './core';
import { SCHEMA_VERSION } from './schema';

// Parents before children: restore inserts in this order and deletes in reverse.
const BACKUP_TABLES = ['lists', 'items', 'user_settings', 'category_preferences', 'item_history', 'favorites'] as const;

type Row = Record<string, string | number | null>;

export type Backup = {
	app: 'groly';
	format: 1;
	schemaVersion: number;
	exportedAt: number;
	// Raw rows with the database's snake_case columns (same names as the server schema)
	tables: Partial<Record<(typeof BACKUP_TABLES)[number], Row[]>>;
};

export class BackupError extends Error {
	constructor(public code: 'invalid' | 'newer') {
		super(code === 'newer' ? 'Backup was created by a newer app version' : 'Not a valid Groly backup');
	}
}

export async function createBackup(db: Db): Promise<Backup> {
	const tables: Backup['tables'] = {};
	for (const table of BACKUP_TABLES) tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
	return { app: 'groly', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: now(), tables };
}

function isRow(value: unknown): value is Row {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).every((v) => v === null || typeof v === 'string' || typeof v === 'number')
	);
}

function validate(data: unknown): Backup {
	const b = data as Backup;
	if (!b || typeof b !== 'object' || b.app !== 'groly' || b.format !== 1 || typeof b.schemaVersion !== 'number' || !b.tables) {
		throw new BackupError('invalid');
	}
	if (b.schemaVersion > SCHEMA_VERSION) throw new BackupError('newer');
	for (const table of BACKUP_TABLES) {
		const rows = b.tables[table];
		if (rows !== undefined && !(Array.isArray(rows) && rows.every(isRow))) throw new BackupError('invalid');
	}
	return b;
}

/** Replaces all data with the backup's contents. Older backups work: missing columns get their defaults. */
export async function restoreBackup(db: Db, data: unknown): Promise<Record<string, number>> {
	const backup = validate(data);
	const counts: Record<string, number> = {};

	await db.withTransactionAsync(async () => {
		for (const table of [...BACKUP_TABLES].reverse()) await db.runAsync(`DELETE FROM ${table}`);

		for (const table of BACKUP_TABLES) {
			const rows = backup.tables[table] ?? [];
			// Only columns this schema knows; table/column names never come from the file
			const known = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
			for (const row of rows) {
				const columns = Object.keys(row).filter((c) => known.has(c));
				if (columns.length === 0) continue;
				await db.runAsync(
					`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
					...columns.map((c) => row[c])
				);
			}
			counts[table] = rows.length;
		}
	});
	return counts;
}
