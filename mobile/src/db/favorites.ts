import { now, type Db } from './core';

export type Favorite = { name: string; quantityInfo: string | null; categoryOverride: string | null; createdAt: number };

export async function getFavorites(db: Db): Promise<Favorite[]> {
	return db.getAllAsync<Favorite>(
		`SELECT name, quantity_info AS quantityInfo, category_override AS categoryOverride, created_at AS createdAt
		FROM favorites ORDER BY lower(name)`
	);
}

/** Like the web app, favourites match items by name regardless of case. */
export const favoriteKey = (name: string) => name.trim().toLowerCase();

export async function addFavorite(db: Db, fav: { name: string; quantityInfo: string | null; categoryOverride: string | null }) {
	const name = fav.name.trim();
	await db.withTransactionAsync(async () => {
		// One favourite per name, whatever its case
		await db.runAsync('DELETE FROM favorites WHERE lower(name) = ?', favoriteKey(name));
		await db.runAsync(
			'INSERT INTO favorites (name, quantity_info, category_override, created_at) VALUES (?, ?, ?, ?)',
			name, fav.quantityInfo?.trim() || null, fav.categoryOverride, now()
		);
	});
}

export async function removeFavorite(db: Db, name: string) {
	await db.runAsync('DELETE FROM favorites WHERE lower(name) = ?', favoriteKey(name));
}
