import { useCallback } from 'react';
import { useLocales } from 'expo-localization';
import { useSettings } from '@/settings';
import { categoryLabel, listIconLabel, resolveLanguage, translate, type MessageKey } from './core';

export { LANGUAGE_NAMES } from './core';

export function useI18n() {
	const { settings } = useSettings();
	const locales = useLocales(); // updates when the device language changes
	const lang = resolveLanguage(settings.lang, locales.map((l) => l.languageCode));

	const t = useCallback(
		(key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params),
		[lang]
	);
	const category = useCallback((key: string) => categoryLabel(key, lang), [lang]);
	const listIcon = useCallback((iconId: string) => listIconLabel(iconId, lang), [lang]);

	return { lang, t, category, listIcon };
}
