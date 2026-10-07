import { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { createList, deleteList, getLists, type List } from '@/db';
import { AddBar } from '@/components/AddBar';
import { ListIcon } from '@/components/ListIcon';
import { useSettings } from '@/settings';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function Lists() {
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t } = useI18n();
	const headerHeight = useHeaderHeight();
	const { settings, update } = useSettings();
	const [lists, setLists] = useState<List[] | null>(null);

	const load = useCallback(async () => setLists(await getLists(db)), [db]);

	// Reload on focus so open counts reflect changes made inside a list
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	async function add(name: string) {
		const id = await createList(db, name);
		await load();
		router.push({ pathname: '/list/[id]', params: { id, name } });
	}

	function confirmDelete(list: List) {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Alert.alert(t('lists.deleteTitle', { name: list.name }), t('lists.deleteMessage'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: async () => {
					await deleteList(db, list.id);
					// Drop the list's own sorting, if any
					if (settings.listCategorySettings?.[list.id]) {
						const { [list.id]: _, ...rest } = settings.listCategorySettings;
						await update({ listCategorySettings: rest });
					}
					await load();
				}
			}
		]);
	}

	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
			<FlatList
				contentInsetAdjustmentBehavior="automatic"
				data={lists ?? []}
				keyExtractor={(l) => l.id}
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					lists ? (
						<Text style={[styles.empty, { color: theme.textMuted }]}>{t('lists.empty')}</Text>
					) : null
				}
				renderItem={({ item }) => (
					<Pressable
						testID={`list-${item.name}`}
						onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id, name: item.name } })}
						onLongPress={() => confirmDelete(item)}
						accessibilityHint={t('common.longPressToDelete')}
						style={({ pressed }) => [styles.card, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
					>
						<ListIcon iconId={item.iconId} />
						<Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
							{item.name}
						</Text>
						<View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
							<Text testID={`list-count-${item.name}`} style={[styles.badgeText, { color: theme.primary }]}>
								{item.openCount}
							</Text>
						</View>
					</Pressable>
				)}
			/>
			<AddBar placeholder={t('lists.newPlaceholder')} onSubmit={add} inputTestID="new-list-input" buttonTestID="new-list-button" />
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	content: { padding: 16, gap: 10 },
	card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 18 },
	name: { flex: 1, fontSize: 17, fontWeight: '600' },
	badge: { minWidth: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
	badgeText: { fontSize: 15, fontWeight: '700' },
	empty: { textAlign: 'center', marginTop: 48, fontSize: 15 }
});
