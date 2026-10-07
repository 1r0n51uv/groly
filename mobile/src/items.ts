import { getCategoryByKey, getCategoryKey } from '$lib/categories';
import type { Item } from '@/db';
import { toDisplay, type CategorySort } from '@/categoryOrder';

export type Section = { key: string; title: string; color: string; data: Item[] };

// Same quick-capture syntax as the web app: "2x Milk, 500g Ground beef, Bread"
const UNIT_RE = /^(\d+(?:[.,]\d+)?\s*(?:x|g|kg|mg|ml|l|el|tl|stk\.?|stück|pck\.?|pkg\.?|dose|flasche|becher|tüte|bund|zehe|scheibe)?)(?:\s+)(.+)$/i;

export function parseQuickEntry(input: string): Array<{ name: string; quantityInfo: string | null }> {
	return input
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.map((token) => {
			const match = token.match(UNIT_RE);
			if (match?.[2]) return { quantityInfo: match[1].trim(), name: match[2].trim() };
			return { name: token, quantityInfo: null };
		});
}

// Suggestions work on the part after the last comma, without its quantity: "2x Milk, 3 Bre" → "Bre"
const lastPart = (text: string) => {
	const i = text.lastIndexOf(',');
	return { before: i >= 0 ? text.slice(0, i + 1) : '', part: i >= 0 ? text.slice(i + 1) : text };
};

/** The name being typed, to look up suggestions for */
export function suggestionQuery(text: string): string {
	const [entry] = parseQuickEntry(lastPart(text).part);
	return entry?.name ?? '';
}

/** Replaces the name being typed with `suggestion`, keeping earlier entries and the quantity. */
export function applySuggestion(text: string, suggestion: string): string {
	const { before, part } = lastPart(text);
	const quantity = parseQuickEntry(part)[0]?.quantityInfo;
	const entry = quantity ? `${quantity} ${suggestion}` : suggestion;
	return before ? `${before} ${entry}` : entry;
}

type GroupLabels ={ category: (key: string) => string; done: string };

/** Display colour of a category ("var(...)" colours are web CSS variables) */
export function categoryColor(key: string, fallbackColor: string): string {
	const color = getCategoryByKey(key).color;
	return color.startsWith('var(') ? fallbackColor : color;
}

/**
 * Open items in category sections (top-down per `sort.order`), or one untitled section in the
 * order they were added when sorting is off; checked items last, most recent first.
 */
export function groupItems(items: Item[], labels: GroupLabels, fallbackColor: string, sort: CategorySort): Section[] {
	const open = items.filter((i) => !i.isChecked);
	const sections: Section[] = [];

	if (!sort.enabled) {
		if (open.length > 0) {
			sections.push({ key: 'all', title: '', color: fallbackColor, data: [...open].sort((a, b) => a.createdAt - b.createdAt) });
		}
	} else {
		const byKey = new Map<string, Item[]>();
		for (const item of open) {
			const key = getCategoryKey(item.name, item.categoryOverride);
			byKey.set(key, [...(byKey.get(key) ?? []), item]);
		}
		for (const key of toDisplay(sort.order)) {
			const data = byKey.get(key);
			if (!data) continue;
			sections.push({
				key,
				title: labels.category(key),
				color: categoryColor(key, fallbackColor),
				data: data.sort((a, b) => a.name.localeCompare(b.name))
			});
		}
	}

	const checked = items
		.filter((i) => i.isChecked)
		.sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0));
	if (checked.length > 0) {
		sections.push({ key: 'checked', title: labels.done, color: '#9e9e9e', data: checked });
	}
	return sections;
}
