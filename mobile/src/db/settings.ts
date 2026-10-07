import { now, type Db } from './core';

export type Language = 'en' | 'de' | 'it';
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * Same keys and meaning as the web app's UserSettings (src/lib/userSettingsTypes.ts), so the JSON can
 * be synced as-is later. Only `lang` differs: the app adds 'it', and leaving it unset follows the device.
 */
export type AppSettings = {
	lang?: Language;
	theme?: ThemeSetting;
	/** Tracker tab (web: "Supplements" section) */
	showSupplementTracker?: boolean;
	nutritionTrackerEnabled?: boolean;
	showRecipes?: boolean;
	/** Group items by category (web default: on) */
	categorySortEnabled?: boolean;
	/** Bottom-up, like the web app: index 0 is the bottom of the screen */
	categoryOrder?: string[];
	/** Per-list override of the two settings above, keyed by list id */
	listCategorySettings?: Record<string, { enabled: boolean; order: string[] }>;
	showFavoriteIndicator?: boolean;
	[key: string]: unknown;
};

type Defaulted = 'theme' | 'showSupplementTracker' | 'nutritionTrackerEnabled' | 'showRecipes' | 'showFavoriteIndicator';
export type ResolvedSettings = AppSettings & Required<Pick<AppSettings, Defaulted>>;

export const DEFAULT_SETTINGS: Required<Pick<AppSettings, Defaulted>> = {
	theme: 'system',
	showSupplementTracker: true,
	nutritionTrackerEnabled: true,
	showRecipes: true,
	showFavoriteIndicator: true
};

function parse(json: string | undefined): AppSettings {
	if (!json) return {};
	try {
		const value = JSON.parse(json);
		return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	} catch {
		return {};
	}
}

export async function getSettings(db: Db): Promise<ResolvedSettings> {
	const row = await db.getFirstAsync<{ settings: string }>('SELECT settings FROM user_settings WHERE id = 1');
	return { ...DEFAULT_SETTINGS, ...parse(row?.settings) };
}

/** Merges `patch` into the stored settings; keys set to `undefined` are removed. */
export async function updateSettings(db: Db, patch: Partial<AppSettings>): Promise<ResolvedSettings> {
	await db.withTransactionAsync(async () => {
		const row = await db.getFirstAsync<{ settings: string }>('SELECT settings FROM user_settings WHERE id = 1');
		const merged: AppSettings = { ...parse(row?.settings), ...patch };
		for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
		await db.runAsync(
			`INSERT INTO user_settings (id, settings, settings_revision, updated_at) VALUES (1, ?, 1, ?)
			ON CONFLICT(id) DO UPDATE SET settings = excluded.settings,
				settings_revision = settings_revision + 1, updated_at = excluded.updated_at`,
			JSON.stringify(merged),
			now()
		);
	});
	return getSettings(db);
}
