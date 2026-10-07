import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORY_ORDER } from '$lib/categories';
import { dropIndex, effectiveSort, fromDisplay, moveInDisplay, moveIndex, normalizeOrder, toDisplay } from './categoryOrder';

describe('drag and drop', () => {
	it('moves an entry and shifts the ones in between', () => {
		expect(moveIndex(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
		expect(moveIndex(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
		expect(moveIndex(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
		expect(moveIndex(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
	});

	it('turns drag distance into a row position, clamped to the list', () => {
		expect(dropIndex(5, 0, 52, 13)).toBe(5);
		expect(dropIndex(5, -60, 52, 13)).toBe(4); // a bit more than one row up
		expect(dropIndex(5, -20, 52, 13)).toBe(5); // less than half a row: stays
		expect(dropIndex(5, 3 * 52, 52, 13)).toBe(8);
		expect(dropIndex(5, -1000, 52, 13)).toBe(0);
		expect(dropIndex(5, 1000, 52, 13)).toBe(12);
	});
});

describe('normalizeOrder', () => {
	it('defaults to the web default order', () => {
		expect(normalizeOrder(undefined)).toEqual(DEFAULT_CATEGORY_ORDER);
	});

	it('drops unknown keys and duplicates, adds missing categories at the bottom', () => {
		const order = normalizeOrder(['milch', 'nope', 'milch', 'obst']);
		expect(order.slice(-2)).toEqual(['milch', 'obst']);
		expect(order).toHaveLength(DEFAULT_CATEGORY_ORDER.length);
		expect(new Set(order)).toEqual(new Set(DEFAULT_CATEGORY_ORDER));
	});
});

describe('effectiveSort', () => {
	it('uses the global settings', () => {
		expect(effectiveSort({ categorySortEnabled: false }, 'l1')).toMatchObject({ enabled: false, custom: false });
	});

	it('a list with its own settings overrides the global ones', () => {
		const settings = {
			categorySortEnabled: false,
			listCategorySettings: { l1: { enabled: true, order: [...DEFAULT_CATEGORY_ORDER].reverse() } }
		};
		const sort = effectiveSort(settings, 'l1');
		expect(sort).toMatchObject({ enabled: true, custom: true });
		expect(sort.order[0]).toBe('default');
		expect(effectiveSort(settings, 'other')).toMatchObject({ enabled: false, custom: false });
	});
});

describe('display order', () => {
	it('round-trips between stored (bottom-up) and displayed (top-down)', () => {
		expect(toDisplay(['a', 'b', 'c'])).toEqual(['c', 'b', 'a']);
		expect(fromDisplay(toDisplay(DEFAULT_CATEGORY_ORDER))).toEqual(DEFAULT_CATEGORY_ORDER);
	});

	it('moves a category one step and stops at the edges', () => {
		expect(moveInDisplay(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
		expect(moveInDisplay(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
		expect(moveInDisplay(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
		expect(moveInDisplay(['a', 'b', 'c'], 'x', 1)).toEqual(['a', 'b', 'c']);
	});
});
