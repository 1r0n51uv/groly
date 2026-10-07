import { DEFAULT_CATEGORY_ORDER, isValidCategoryKey } from '$lib/categories';
import type { AppSettings } from '@/db';

// Stored exactly like the web app's settings (categoryOrder, listCategorySettings), which list
// categories bottom-up: index 0 is the bottom of the screen. The app shows them top-down, so
// anything user-facing goes through toDisplay/fromDisplay.

export type CategorySort = {
	/** false: no category sections, items in the order they were added */
	enabled: boolean;
	/** Stored (bottom-up) order */
	order: string[];
	/** true when the list has its own order instead of the global one */
	custom: boolean;
};

/** Valid keys only, no duplicates; categories missing from an old order are added at the bottom. */
export function normalizeOrder(order: unknown): string[] {
	const given = Array.isArray(order) ? order.filter(isValidCategoryKey) : [];
	const unique = [...new Set(given)];
	const missing = DEFAULT_CATEGORY_ORDER.filter((key) => !unique.includes(key));
	return [...missing, ...unique];
}

export function effectiveSort(settings: AppSettings, listId?: string): CategorySort {
	const list = listId ? settings.listCategorySettings?.[listId] : undefined;
	if (list && typeof list === 'object') {
		return { enabled: list.enabled !== false, order: normalizeOrder(list.order), custom: true };
	}
	return { enabled: settings.categorySortEnabled !== false, order: normalizeOrder(settings.categoryOrder), custom: false };
}

export const toDisplay = (order: string[]) => [...order].reverse();
export const fromDisplay = (displayOrder: string[]) => [...displayOrder].reverse();

/** Moves `key` one step up (-1) or down (+1) in a top-down display order. */
export function moveInDisplay(displayOrder: string[], key: string, delta: -1 | 1): string[] {
	const from = displayOrder.indexOf(key);
	const to = from + delta;
	if (from < 0 || to < 0 || to >= displayOrder.length) return displayOrder;
	const next = [...displayOrder];
	[next[from], next[to]] = [next[to], next[from]];
	return next;
}
