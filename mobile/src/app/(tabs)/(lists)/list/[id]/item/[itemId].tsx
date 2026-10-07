import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoryKey } from '$lib/categories';
import { addFavorite, deleteItem, favoriteKey, getFavorites, getItem, removeFavorite, updateItem, type Item } from '@/db';
import { effectiveSort, toDisplay } from '@/categoryOrder';
import { Action, Choice, Row, Section, SwitchRow, formStyles } from '@/components/Form';
import { categoryColor } from '@/items';
import { useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

/** Edit sheet (opened by long-pressing an item): name, quantity, category, favourite, delete. */
export default function EditItem() {
	const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t, category } = useI18n();
	const { settings } = useSettings();

	const [item, setItem] = useState<Item | null>(null);
	const [name, setName] = useState('');
	const [quantity, setQuantity] = useState('');
	const [override, setOverride] = useState<string | null>(null);
	const [pickerUsed, setPickerUsed] = useState(false);
	const [favorite, setFavorite] = useState(false);
	const [wasFavorite, setWasFavorite] = useState(false);

	useEffect(() => {
		(async () => {
			const loaded = await getItem(db, itemId);
			if (!loaded) return router.back();
			const isFav = (await getFavorites(db)).some((f) => favoriteKey(f.name) === favoriteKey(loaded.name));
			setItem(loaded);
			setName(loaded.name);
			setQuantity(loaded.quantityInfo ?? '');
			setOverride(loaded.categoryOverride);
			setFavorite(isFav);
			setWasFavorite(isFav);
		})();
	}, [db, itemId]);

	function pick(key: string | null) {
		setOverride(key);
		setPickerUsed(true);
	}

	async function save() {
		if (!item) return;
		const finalName = name.trim() || item.name;
		await updateItem(db, item, { name: finalName, quantityInfo: quantity, categoryOverride: override, categoryPickerUsed: pickerUsed });
		if (favorite) {
			if (wasFavorite) await removeFavorite(db, item.name); // name may have changed
			await addFavorite(db, { name: finalName, quantityInfo: quantity, categoryOverride: override });
		} else if (wasFavorite) {
			await removeFavorite(db, item.name);
		}
		router.back();
	}

	function remove() {
		if (!item) return;
		Alert.alert(t('list.deleteItemTitle', { name: item.name }), undefined, [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: async () => {
					await deleteItem(db, item);
					router.back();
				}
			}
		]);
	}

	// "Automatic" shows what the resolver would pick for the current name
	const autoKey = getCategoryKey(name || item?.name || '', null);
	const keys = toDisplay(effectiveSort(settings, id).order);
	const input = [formStyles.input, { color: theme.text }];

	return (
		<ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
			<Stack.Screen
				options={{
					headerRight: () => (
						<Pressable testID="item-save" onPress={save} hitSlop={12} accessibilityRole="button">
							<Text style={{ color: theme.primary, fontSize: 17, fontWeight: '600' }}>{t('common.save')}</Text>
						</Pressable>
					)
				}}
			/>
			<Section>
				<Row first>
					<Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('item.name')}</Text>
					<TextInput testID="item-name" style={input} value={name} onChangeText={setName} returnKeyType="done" />
				</Row>
				<Row>
					<Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('item.quantity')}</Text>
					<TextInput testID="item-quantity" style={input} value={quantity} onChangeText={setQuantity} placeholder="—" placeholderTextColor={theme.textMuted} returnKeyType="done" />
				</Row>
				<SwitchRow testID="item-favorite" label={`★ ${t('item.favorite')}`} value={favorite} onChange={setFavorite} />
			</Section>

			<Section title={t('item.category')}>
				<Choice
					first
					testID="category-auto"
					label={t('item.categoryAuto', { category: category(autoKey) })}
					selected={override === null}
					onPress={() => pick(null)}
				/>
				{keys.map((key) => (
					<Choice
						key={key}
						testID={`category-${key}`}
						label={category(key)}
						selected={override === key}
						onPress={() => pick(key)}
						leading={<View style={[styles.dot, { backgroundColor: categoryColor(key, theme.primary) }]} />}
					/>
				))}
			</Section>

			<Section>
				<Action first destructive testID="item-delete" icon="trash-outline" label={t('item.delete')} onPress={remove} />
			</Section>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	fieldLabel: { width: 90, fontSize: 15 },
	dot: { width: 10, height: 10, borderRadius: 5 }
});
