import { describe, expect, it } from 'vitest';
import type { Item } from '@/db';
import { categoryLabel } from '@/i18n/core';
import { effectiveSort } from '@/categoryOrder';
import { applySuggestion, groupItems, parseQuickEntry, suggestionQuery } from './items';

const defaultSort = effectiveSort({});

const labels = (lang: 'en' | 'de' | 'it') => ({ category: (k: string) => categoryLabel(k, lang), done: 'Done' });

function item(name: string, extra: Partial<Item> = {}): Item {
	return {
		id: name, listId: 'l', name, quantityInfo: null, isChecked: false, checkedAt: null,
		categoryOverride: null, createdAt: 0, updatedAt: 0, ...extra
	};
}

describe('parseQuickEntry', () => {
	it('splits on commas and reads leading quantities', () => {
		expect(parseQuickEntry('2x Milk, 500g Ground beef, Bread')).toEqual([
			{ name: 'Milk', quantityInfo: '2x' },
			{ name: 'Ground beef', quantityInfo: '500g' },
			{ name: 'Bread', quantityInfo: null }
		]);
	});

	it('ignores empty parts and keeps plain numbers in names', () => {
		expect(parseQuickEntry(' , Eggs ,, 7Up ')).toEqual([
			{ name: 'Eggs', quantityInfo: null },
			{ name: '7Up', quantityInfo: null }
		]);
	});
});

describe('groupItems', () => {
	const fallback = '#000';

	it('groups by category in supermarket order with the done section last', () => {
		const sections = groupItems(
			[item('Bananen'), item('Milch'), item('Brot', { isChecked: true, checkedAt: 5 })],
			labels('en'),
			fallback,
			defaultSort
		);
		expect(sections.map((s) => s.key)).toEqual(['milch', 'obst', 'checked']);
		expect(sections[0].title).toBe('Dairy');
	});

	it('honours a category override', () => {
		const [section] = groupItems([item('Milch', { categoryOverride: 'haushalt' })], labels('de'), fallback, defaultSort);
		expect(section).toMatchObject({ key: 'haushalt', title: 'Haushalt' });
	});

	it('lists the most recently checked items first', () => {
		const done = groupItems(
			[item('A', { isChecked: true, checkedAt: 1 }), item('B', { isChecked: true, checkedAt: 9 })],
			labels('en'),
			fallback,
			defaultSort
		).find((s) => s.key === 'checked')!;
		expect(done.data.map((i) => i.name)).toEqual(['B', 'A']);
	});

	it('follows a custom order (stored bottom-up, shown top-down)', () => {
		const sort = effectiveSort({ categoryOrder: ['milch', 'obst'] }); // obst on top
		const keys = groupItems([item('Milch'), item('Bananen')], labels('en'), fallback, sort).map((s) => s.key);
		expect(keys).toEqual(['obst', 'milch']);
	});

	it('shows one untitled section in insertion order when sorting is off', () => {
		const sections = groupItems(
			[item('Zucchini', { createdAt: 2 }), item('Milch', { createdAt: 1 }), item('Brot', { isChecked: true, checkedAt: 1 })],
			labels('en'),
			fallback,
			effectiveSort({ categorySortEnabled: false })
		);
		expect(sections.map((s) => [s.key, s.title, s.data.map((i) => i.name)])).toEqual([
			['all', '', ['Milch', 'Zucchini']],
			['checked', 'Done', ['Brot']]
		]);
	});
});

describe('suggestions in the add bar', () => {
	it('looks up the name after the last comma, without its quantity', () => {
		expect(suggestionQuery('Mil')).toBe('Mil');
		expect(suggestionQuery('2x Milk, 500g Hack')).toBe('Hack');
		expect(suggestionQuery('Bread, ')).toBe('');
	});

	it('replaces only that name and keeps quantity and earlier entries', () => {
		expect(applySuggestion('Mil', 'Milch')).toBe('Milch');
		expect(applySuggestion('2x Mil', 'Milch')).toBe('2x Milch');
		expect(applySuggestion('Brot, 500g Hack', 'Hackfleisch')).toBe('Brot, 500g Hackfleisch');
		expect(parseQuickEntry(applySuggestion('Brot, 500g Hack', 'Hackfleisch'))).toEqual([
			{ name: 'Brot', quantityInfo: null },
			{ name: 'Hackfleisch', quantityInfo: '500g' }
		]);
	});
});
