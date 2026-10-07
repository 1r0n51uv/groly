import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getCategoryKey } from '$lib/categories';
import { addItems, favoriteKey, getFavorites, getItems, removeFavorite, type Favorite } from '@/db';
import { effectiveSort, toDisplay } from '@/categoryOrder';
import { categoryColor } from '@/items';
import { useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

/** Favourites by category: tap adds to this list, long-press removes the favourite. */
export default function Favorites() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t, category } = useI18n();
	const { settings } = useSettings();
	const [favorites, setFavorites] = useState<Favorite[] | null>(null);
	const [onList, setOnList] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		const [favs, items] = await Promise.all([getFavorites(db), getItems(db, id)]);
		setFavorites(favs);
		setOnList(new Set(items.filter((i) => !i.isChecked).map((i) => favoriteKey(i.name))));
	}, [db, id]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	async function add(fav: Favorite) {
		if (onList.has(favoriteKey(fav.name))) return;
		Haptics.selectionAsync();
		await addItems(db, id, [fav]);
		await load();
	}

	function remove(fav: Favorite) {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Alert.alert(t('favorites.removeTitle', { name: fav.name }), undefined, [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.remove'),
				style: 'destructive',
				onPress: async () => {
					await removeFavorite(db, fav.name);
					await load();
				}
			}
		]);
	}

	const sections = useMemo(() => {
		const byKey = new Map<string, Favorite[]>();
		for (const fav of favorites ?? []) {
			const key = getCategoryKey(fav.name, fav.categoryOverride);
			byKey.set(key, [...(byKey.get(key) ?? []), fav]);
		}
		return toDisplay(effectiveSort(settings, id).order)
			.filter((key) => byKey.has(key))
			.map((key) => ({ key, title: category(key), color: categoryColor(key, theme.primary), data: byKey.get(key)! }));
	}, [favorites, settings, id, category, theme.primary]);

	return (
		<SectionList
			sections={sections}
			keyExtractor={(f) => f.name}
			contentContainerStyle={styles.content}
			stickySectionHeadersEnabled={false}
			ListEmptyComponent={
				favorites ? (
					<Text testID="favorites-empty" style={[styles.empty, { color: theme.textMuted }]}>
						{t('favorites.empty')}
					</Text>
				) : null
			}
			renderSectionHeader={({ section }) => (
				<View style={styles.sectionHeader}>
					<View style={[styles.dot, { backgroundColor: section.color }]} />
					<Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.title}</Text>
				</View>
			)}
			renderItem={({ item: fav }) => {
				const added = onList.has(favoriteKey(fav.name));
				return (
					<Pressable
						testID={`favorite-${fav.name}`}
						onPress={() => add(fav)}
						onLongPress={() => remove(fav)}
						style={({ pressed }) => [styles.row, { backgroundColor: theme.card, opacity: pressed || added ? 0.6 : 1 }]}
						accessibilityRole="button"
						accessibilityState={{ disabled: added }}
					>
						<Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
							{fav.name}
						</Text>
						{fav.quantityInfo ? <Text style={{ color: theme.textMuted }}>{fav.quantityInfo}</Text> : null}
						{added ? (
							<Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('favorites.onList')}</Text>
						) : (
							<Ionicons name="add-circle" size={24} color={theme.primary} />
						)}
					</Pressable>
				);
			}}
		/>
	);
}

const styles = StyleSheet.create({
	content: { padding: 16, paddingBottom: 40 },
	sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 },
	dot: { width: 10, height: 10, borderRadius: 5 },
	sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 6 },
	name: { flex: 1, fontSize: 16 },
	empty: { textAlign: 'center', marginTop: 48, fontSize: 15, lineHeight: 22, paddingHorizontal: 16 }
});
