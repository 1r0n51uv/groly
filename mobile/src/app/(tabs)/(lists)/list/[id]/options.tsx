import { useCallback, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LIST_ICONS } from '$lib/listIcons';
import { clearCheckedItems, getItems, getList, renameList, setListIcon, type List } from '@/db';
import { effectiveSort } from '@/categoryOrder';
import { CategoryOrderEditor } from '@/components/CategoryOrderEditor';
import { Action, Choice, Row, Section, SwitchRow, formStyles } from '@/components/Form';
import { ListIcon } from '@/components/ListIcon';
import { useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

export default function ListOptions() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t, listIcon } = useI18n();
	const { settings, update } = useSettings();
	const [list, setList] = useState<List | null>(null);
	const [name, setName] = useState('');
	const [checkedCount, setCheckedCount] = useState(0);

	const load = useCallback(async () => {
		const [l, items] = await Promise.all([getList(db, id), getItems(db, id)]);
		setList(l);
		setName(l?.name ?? '');
		setCheckedCount(items.filter((i) => i.isChecked).length);
	}, [db, id]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	async function saveName() {
		if (!list || !name.trim() || name.trim() === list.name) return setName(list?.name ?? '');
		await renameList(db, id, name);
		await load();
	}

	async function chooseIcon(iconId: string | null) {
		await setListIcon(db, id, iconId);
		await load();
	}

	function clearChecked() {
		Alert.alert(t('listOptions.clearCheckedConfirm', { count: checkedCount }), undefined, [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.remove'),
				style: 'destructive',
				onPress: async () => {
					await clearCheckedItems(db, id);
					await load();
				}
			}
		]);
	}

	const sort = effectiveSort(settings, id);
	const listSettings = settings.listCategorySettings ?? {};

	// Same storage as the web app: an entry in listCategorySettings means "own order"
	function setCustom(on: boolean) {
		const next = { ...listSettings };
		if (on) next[id] = { enabled: sort.enabled, order: sort.order };
		else delete next[id];
		update({ listCategorySettings: next });
	}

	return (
		<ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
			<Section title={t('listOptions.name')}>
				<Row first>
					<TextInput
						testID="list-name"
						style={[formStyles.input, { color: theme.text }]}
						value={name}
						onChangeText={setName}
						onEndEditing={saveName}
						onSubmitEditing={saveName}
						returnKeyType="done"
					/>
				</Row>
			</Section>

			<Section title={t('listOptions.icon')}>
				<Choice first testID="icon-none" label={t('listOptions.noIcon')} selected={!list?.iconId} onPress={() => chooseIcon(null)} />
				{LIST_ICONS.map((icon) => (
					<Choice
						key={icon.id}
						testID={`icon-${icon.id}`}
						label={listIcon(icon.id)}
						selected={list?.iconId === icon.id}
						onPress={() => chooseIcon(icon.id)}
						leading={<ListIcon iconId={icon.id} size={28} />}
					/>
				))}
			</Section>

			<Section hint={checkedCount === 0 ? t('listOptions.nothingChecked') : undefined}>
				<Action
					first
					destructive
					testID="clear-checked"
					icon="checkmark-done-outline"
					label={checkedCount > 0 ? `${t('listOptions.clearChecked')} (${checkedCount})` : t('listOptions.clearChecked')}
					onPress={clearChecked}
					disabled={checkedCount === 0}
				/>
			</Section>

			<Section title={t('listOptions.sorting')} hint={sort.custom ? undefined : t('listOptions.customOrderHint')}>
				<SwitchRow first testID="list-custom-order" label={t('listOptions.customOrder')} value={sort.custom} onChange={setCustom} />
			</Section>
			{sort.custom && (
				<CategoryOrderEditor
					enabled={sort.enabled}
					order={sort.order}
					onChange={(enabled, order) => update({ listCategorySettings: { ...listSettings, [id]: { enabled, order } } })}
				/>
			)}
		</ScrollView>
	);
}
