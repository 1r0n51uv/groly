import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/sqlite';
import { migrate } from './schema';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings';

let db: ReturnType<typeof createTestDb>;

beforeEach(async () => {
	db = createTestDb();
	await migrate(db);
});

const revision = () => (db.raw.prepare('SELECT settings_revision AS r FROM user_settings').get() as { r: number }).r;

describe('settings', () => {
	it('returns defaults before anything is saved', async () => {
		expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
	});

	it('merges updates and bumps the revision', async () => {
		await updateSettings(db, { lang: 'it' });
		expect(revision()).toBe(1);
		const s = await updateSettings(db, { showRecipes: false });
		expect(s).toMatchObject({ lang: 'it', showRecipes: false, showSupplementTracker: true });
		expect(revision()).toBe(2);
	});

	it('removes keys set to undefined (back to following the device language)', async () => {
		await updateSettings(db, { lang: 'de' });
		const s = await updateSettings(db, { lang: undefined });
		expect(s.lang).toBeUndefined();
		expect(db.raw.prepare('SELECT settings FROM user_settings').get()).toEqual({ settings: '{}' });
	});

	it('keeps keys it does not know, so web-only settings survive a sync', async () => {
		db.raw.exec(`INSERT INTO user_settings (id, settings, updated_at) VALUES (1, '{"waterGoalMl":2500}', 1)`);
		await updateSettings(db, { theme: 'dark' });
		expect(await getSettings(db)).toMatchObject({ waterGoalMl: 2500, theme: 'dark' });
	});

	it('falls back to defaults on corrupt JSON', async () => {
		db.raw.exec(`INSERT INTO user_settings (id, settings, updated_at) VALUES (1, 'not json', 1)`);
		expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
	});
});
