import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { addFavorite, getFavorites, removeFavorite } from './favorites';
import { migrate } from './schema';

let db: ReturnType<typeof createTestDb>;

beforeEach(async () => {
	db = createTestDb();
	await migrate(db);
});

describe('favourites', () => {
	it('stores quantity and category', async () => {
		await addFavorite(db, { name: ' Hafermilch ', quantityInfo: '2x', categoryOverride: 'getraenke' });
		expect(await getFavorites(db)).toEqual([
			{ name: 'Hafermilch', quantityInfo: '2x', categoryOverride: 'getraenke', createdAt: expect.any(Number) }
		]);
	});

	it('keeps one favourite per name regardless of case', async () => {
		await addFavorite(db, { name: 'milch', quantityInfo: null, categoryOverride: null });
		await addFavorite(db, { name: 'Milch', quantityInfo: '1l', categoryOverride: null });
		expect((await getFavorites(db)).map((f) => [f.name, f.quantityInfo])).toEqual([['Milch', '1l']]);
	});

	it('removes by name regardless of case', async () => {
		await addFavorite(db, { name: 'Brot', quantityInfo: null, categoryOverride: null });
		await removeFavorite(db, 'BROT');
		expect(await getFavorites(db)).toEqual([]);
	});
});
