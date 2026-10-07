import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getSettings, updateSettings, type AppSettings, type ResolvedSettings } from '@/db';

type SettingsContextValue = {
	settings: ResolvedSettings;
	update: (patch: Partial<AppSettings>) => Promise<void>;
	/** Re-read from the database, e.g. after restoring a backup */
	reload: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
	const db = useSQLiteContext();
	const [settings, setSettings] = useState<ResolvedSettings | null>(null);

	const reload = useCallback(async () => setSettings(await getSettings(db)), [db]);
	const update = useCallback(async (patch: Partial<AppSettings>) => setSettings(await updateSettings(db, patch)), [db]);

	useEffect(() => {
		reload();
	}, [reload]);

	// App-wide, so native UI (alerts, keyboard, date pickers) follows the chosen theme too
	useEffect(() => {
		if (settings) Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
	}, [settings?.theme]);

	// Rendering waits for settings so the first frame already has the right language and tabs
	if (!settings) return null;
	return <SettingsContext.Provider value={{ settings, update, reload }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
	const ctx = useContext(SettingsContext);
	if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
	return ctx;
}
