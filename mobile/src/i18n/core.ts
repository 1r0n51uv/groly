import { CATEGORY_LABELS } from '$lib/categories';
import { LIST_ICONS, getListIcon, getListIconLabel } from '$lib/listIcons';
import type { Language } from '@/db/settings';
import { de } from './de';
import { en, type MessageKey, type Messages } from './en';
import { it } from './it';

export type { MessageKey };

export const CATALOGS: Record<Language, Messages> = { en, de, it };

/** Shown in their own language, so a user can always find theirs */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', de: 'Deutsch', it: 'Italiano' };

export function isLanguage(value: unknown): value is Language {
	return typeof value === 'string' && value in CATALOGS;
}

/** The explicit setting wins; otherwise the first supported device language; otherwise English. */
export function resolveLanguage(setting: Language | undefined, deviceLanguages: Array<string | null>): Language {
	if (setting) return setting;
	return deviceLanguages.map((l) => l?.toLowerCase()).find(isLanguage) ?? 'en';
}

export function translate(lang: Language, key: MessageKey, params?: Record<string, string | number>): string {
	const template = CATALOGS[lang][key] ?? en[key];
	return params ? template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : template;
}

// The web app only has German and English category names
const IT_CATEGORY_LABELS: Record<string, string> = {
	obst: 'Frutta e verdura',
	nudeln: 'Pasta e riso',
	backwaren: 'Panetteria',
	milch: 'Latticini',
	fleisch: 'Carne e pesce',
	konserven: 'Conserve e salse',
	gewuerze: 'Spezie e dispensa',
	getraenke: 'Bevande',
	tiefkuehl: 'Surgelati',
	snacks: 'Snack e dolci',
	haushalt: 'Casa',
	koerperpflege: 'Cura della persona',
	default: 'Tutto il resto'
};

export function categoryLabel(key: string, lang: Language): string {
	if (lang === 'it') return IT_CATEGORY_LABELS[key] ?? key;
	return CATEGORY_LABELS[key]?.[lang] ?? key;
}

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// The web app's list icons carry German and English labels only
const IT_LIST_ICON_LABELS: Record<string, string> = {
	supermarkt: 'Supermercato',
	drogerie: 'Drogheria',
	bio: 'Bio / Naturale',
	baeckerei: 'Panetteria',
	haushalt: 'Casa',
	apotheke: 'Farmacia',
	online: 'Online',
	laden: 'Negozio',
	rezept: 'Ricetta'
};

export function listIconLabel(iconId: string, lang: Language): string {
	const icon = getListIcon(iconId);
	if (!icon) return iconId;
	return lang === 'it' ? (IT_LIST_ICON_LABELS[iconId] ?? icon.labelEn) : getListIconLabel(icon, lang);
}
