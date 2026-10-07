import { describe, expect, it } from 'vitest';
import { LIST_ICONS } from '$lib/listIcons';
import { CATALOGS, CATEGORY_KEYS, categoryLabel, listIconLabel, resolveLanguage, translate } from './core';
import { en } from './en';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalogs', () => {
	for (const [lang, messages] of Object.entries(CATALOGS)) {
		it(`${lang}: has every key, none empty, same placeholders as English`, () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
			for (const [key, value] of Object.entries(messages)) {
				expect(value.trim(), key).not.toBe('');
				expect(placeholders(value), key).toEqual(placeholders(en[key as keyof typeof en]));
			}
		});
	}

	it('every category has a label in every language', () => {
		for (const lang of ['en', 'de', 'it'] as const) {
			for (const key of CATEGORY_KEYS) expect(categoryLabel(key, lang), `${lang}/${key}`).not.toBe(key);
		}
		expect(categoryLabel('milch', 'it')).toBe('Latticini');
	});
});

describe('translate', () => {
	it('fills placeholders', () => {
		expect(translate('it', 'settings.importDoneMessage', { lists: 2, items: 7 })).toBe('2 liste e 7 articoli importati.');
	});

	it('leaves unknown placeholders visible instead of dropping text', () => {
		expect(translate('en', 'lists.deleteTitle', {})).toBe('Delete "{name}"?');
	});
});

describe('resolveLanguage', () => {
	it('prefers the explicit setting', () => {
		expect(resolveLanguage('it', ['de'])).toBe('it');
	});

	it('follows the first supported device language', () => {
		expect(resolveLanguage(undefined, ['fr', 'IT', 'de'])).toBe('it');
	});

	it('falls back to English', () => {
		expect(resolveLanguage(undefined, ['fr', null])).toBe('en');
		expect(resolveLanguage(undefined, [])).toBe('en');
	});
});

describe('list icons', () => {
	it('every icon has a label in every language', () => {
		for (const icon of LIST_ICONS) {
			for (const lang of ['en', 'de', 'it'] as const) expect(listIconLabel(icon.id, lang).trim(), `${lang}/${icon.id}`).not.toBe('');
			// Italian must not silently fall back to English ("Online" is the same word)
			if (icon.id !== 'online') expect(listIconLabel(icon.id, 'it'), icon.id).not.toBe(icon.labelEn);
		}
		expect(listIconLabel('apotheke', 'it')).toBe('Farmacia');
		expect(listIconLabel('apotheke', 'de')).toBe('Apotheke');
	});
});
