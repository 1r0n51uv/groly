import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addItems, favoriteKey, getFavorites, getItems, getList, getSuggestions, setItemChecked, type Item, type List } from '@/db';
import { effectiveSort } from '@/categoryOrder';
import { groupItems, parseQuickEntry } from '@/items';
import { AddBar } from '@/components/AddBar';
import { useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

export default function ListScreen() {
	const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t, category } = useI18n();
	const { settings } = useSettings();
	const headerHeight = useHeaderHeight();
	const [list, setList] = useState<List | null>(null);
	const [items, setItems] = useState<Item[] | null>(null);
	const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		const [l, i, f] = await Promise.all([getList(db, id), getItems(db, id), getFavorites(db)]);
		setList(l);
		setItems(i);
		setFavoriteNames(new Set(f.map((fav) => favoriteKey(fav.name))));
	}, [db, id]);

	// Also after returning from the edit sheet, options or favourites
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	async function toggle(item: Item) {
		Haptics.selectionAsync();
		await setItemChecked(db, item, !item.isChecked);
		await load();
	}

	function edit(item: Item) {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		router.push({ pathname: '/list/[id]/item/[itemId]', params: { id, itemId: item.id } });
	}

	async function add(text: string) {
		const entries = parseQuickEntry(text);
		if (entries.length === 0) return;
		await addItems(db, id, entries);
		await load();
	}

	// Like the web app: don't suggest what is already open on this list
	const openNames = useMemo(() => new Set((items ?? []).filter((i) => !i.isChecked).map((i) => favoriteKey(i.name))), [items]);
	const suggest = useCallback(
		async (query: string) => (await getSuggestions(db, query, 12)).filter((n) => !openNames.has(favoriteKey(n))).slice(0, 8),
		[db, openNames]
	);

	const sections = useMemo(
		() => groupItems(items ?? [], { category, done: t('list.done') }, theme.primary, effectiveSort(settings, id)),
		[items, category, t, theme.primary, settings, id]
	);
	const showDot = settings.showFavoriteIndicator;

	return (
		// Android is edge-to-edge since SDK 54, so it needs explicit keyboard avoidance too
		<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
			<Stack.Screen
				options={{
					title: list?.name ?? name ?? '',
					headerRight: () => (
						<Pressable
							testID="list-options-button"
							onPress={() => router.push({ pathname: '/list/[id]/options', params: { id } })}
							hitSlop={12}
							accessibilityRole="button"
							accessibilityLabel={t('listOptions.title')}
						>
							<Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={theme.primary} />
						</Pressable>
					)
				}}
			/>
			<SectionList
				sections={sections}
				keyExtractor={(i) => i.id}
				contentContainerStyle={styles.content}
				stickySectionHeadersEnabled={false}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					items ? (
						<Text testID="list-empty" style={[styles.empty, { color: theme.textMuted }]}>
							{t('list.empty')}
						</Text>
					) : null
				}
				renderSectionHeader={({ section }) =>
					section.title ? (
						<View testID={`section-${section.key}`} style={styles.sectionHeader}>
							<View style={[styles.dot, { backgroundColor: section.color }]} />
							<Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.title}</Text>
						</View>
					) : (
						<View testID={`section-${section.key}`} style={styles.untitled} />
					)
				}
				renderItem={({ item }) => (
					<Pressable
						testID={`item-${item.name}`}
						onPress={() => toggle(item)}
						onLongPress={() => edit(item)}
						style={({ pressed }) => [styles.row, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: item.isChecked }}
						accessibilityHint={t('item.title')}
					>
						<View
							style={[
								styles.check,
								{ borderColor: item.isChecked ? theme.outline : theme.primary },
								item.isChecked && { backgroundColor: theme.outline }
							]}
						>
							{item.isChecked && <Text style={styles.checkMark}>✓</Text>}
						</View>
						<Text
							style={[styles.itemName, { color: item.isChecked ? theme.textMuted : theme.text }, item.isChecked && styles.strike]}
							numberOfLines={2}
						>
							{item.name}
						</Text>
						{item.quantityInfo ? <Text style={[styles.qty, { color: theme.textMuted }]}>{item.quantityInfo}</Text> : null}
						{showDot && favoriteNames.has(favoriteKey(item.name)) && (
							<View testID={`fav-dot-${item.name}`} style={[styles.favDot, { backgroundColor: theme.primary }]} />
						)}
					</Pressable>
				)}
			/>
			<AddBar
				placeholder={t('list.addPlaceholder')}
				onSubmit={add}
				getSuggestions={suggest}
				inputTestID="add-input"
				buttonTestID="add-button"
				leading={
					<Pressable
						testID="favorites-button"
						onPress={() => router.push({ pathname: '/list/[id]/favorites', params: { id } })}
						style={[styles.favButton, { backgroundColor: theme.card }]}
						accessibilityRole="button"
						accessibilityLabel={t('favorites.open')}
					>
						<Ionicons name="star" size={22} color={theme.primary} />
					</Pressable>
				}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	content: { padding: 16, paddingBottom: 24 },
	sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 },
	untitled: { height: 8 },
	dot: { width: 10, height: 10, borderRadius: 5 },
	sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 6 },
	check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
	checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
	itemName: { flex: 1, fontSize: 16 },
	strike: { textDecorationLine: 'line-through' },
	qty: { fontSize: 14 },
	favDot: { width: 8, height: 8, borderRadius: 4 },
	favButton: { width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	empty: { textAlign: 'center', marginTop: 48, fontSize: 15 }
});
