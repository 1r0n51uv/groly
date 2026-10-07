// Source of truth: de.ts and it.ts must define exactly these keys (enforced by their type).
// Placeholders use the web app's syntax: {name}
export const en = {
	'tabs.lists': 'Lists',
	'tabs.tracker': 'Tracker',
	'tabs.nutrition': 'Nutrition',
	'tabs.recipes': 'Recipes',
	'tabs.settings': 'Settings',

	'common.cancel': 'Cancel',
	'common.delete': 'Delete',
	'common.add': 'Add',
	'common.longPressToDelete': 'Long press to delete',

	'lists.empty': 'No lists yet. Create one below.',
	'lists.newPlaceholder': 'New list',
	'lists.deleteTitle': 'Delete "{name}"?',
	'lists.deleteMessage': 'All items in this list will be deleted.',

	'list.empty': 'This list is empty.',
	'list.addPlaceholder': 'Add items (e.g. 2x Milk, Bread)',
	'list.deleteItemTitle': 'Delete "{name}"?',
	'list.done': 'Done',

	'common.save': 'Save',
	'common.remove': 'Remove',

	'listOptions.title': 'List options',
	'listOptions.name': 'Name',
	'listOptions.icon': 'Icon',
	'listOptions.noIcon': 'None',
	'listOptions.clearChecked': 'Remove checked items',
	'listOptions.clearCheckedConfirm': 'Remove {count} checked items?',
	'listOptions.nothingChecked': 'There are no checked items.',
	'listOptions.sorting': 'Sorting',
	'listOptions.customOrder': 'Own order for this list',
	'listOptions.customOrderHint': 'Off: this list uses the sorting from Settings.',

	'sort.groupByCategory': 'Group by category',
	'sort.orderHint': 'Top to bottom, the way you walk through the shop.',
	'sort.moveUp': 'Move {category} up',
	'sort.moveDown': 'Move {category} down',

	'item.title': 'Edit item',
	'item.name': 'Name',
	'item.quantity': 'Quantity',
	'item.category': 'Category',
	'item.categoryAuto': 'Automatic ({category})',
	'item.favorite': 'Favourite',
	'item.delete': 'Delete item',

	'favorites.title': 'Favourites',
	'favorites.open': 'Open favourites',
	'favorites.empty': 'No favourites yet. Long-press an item on a list and turn on the star.',
	'favorites.removeTitle': 'Remove "{name}" from favourites?',
	'favorites.onList': 'On the list',

	'settings.lists': 'Shopping lists',
	'settings.categoryOrder': 'Category order',
	'settings.showFavoriteIndicator': 'Mark favourites with a dot',

	'comingSoon.title': 'Coming soon',
	'comingSoon.body': '{feature} is planned for a later update. You can hide this tab in Settings.',

	'settings.language': 'Language',
	'settings.languageSystem': 'Device language',
	'settings.appearance': 'Appearance',
	'settings.themeSystem': 'System',
	'settings.themeLight': 'Light',
	'settings.themeDark': 'Dark',
	'settings.sections': 'Sections',
	'settings.sectionsHint': 'Hidden sections disappear from the tab bar. Their data is kept.',
	'settings.backup': 'Backup',
	'settings.backupHint': 'All data is stored only on this device. Export a backup to keep it safe or move it to a new phone.',
	'settings.export': 'Export backup',
	'settings.import': 'Import backup',
	'settings.importConfirmTitle': 'Replace all data?',
	'settings.importConfirmMessage': 'Your current lists and settings will be replaced by the backup. This cannot be undone.',
	'settings.importConfirm': 'Replace',
	'settings.importDone': 'Backup restored',
	'settings.importDoneMessage': '{lists} lists and {items} items imported.',
	'settings.importInvalid': "This file isn't a valid Groly backup.",
	'settings.importNewer': 'This backup was created by a newer version of Groly. Please update the app first.',
	'settings.exportFailed': 'Export failed',
	'settings.importFailed': 'Import failed',
	'settings.about': 'About',
	'settings.version': 'Version {version}',
	'settings.disclaimerTitle': 'Health information',
	'settings.disclaimer':
		'Groly is not a medical device. Nutrition, supplement and calorie information is for general guidance only and does not replace advice from a doctor or nutritionist.'
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
