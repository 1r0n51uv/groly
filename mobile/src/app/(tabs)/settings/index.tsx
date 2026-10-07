import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BackupError, restoreBackup, type AppSettings, type Language, type ThemeSetting } from '@/db';
import { pickBackup, shareBackup } from '@/backupFile';
import { Action, Choice, Label, Row, Section, SwitchRow, formStyles } from '@/components/Form';
import { LANGUAGE_NAMES, useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

export default function Settings() {
	const db = useSQLiteContext();
	const theme = useTheme();
	const { t } = useI18n();
	const { settings, update, reload } = useSettings();
	const [busy, setBusy] = useState(false);

	const languages: Array<{ value: Language | undefined; label: string }> = [
		{ value: undefined, label: t('settings.languageSystem') },
		...(Object.keys(LANGUAGE_NAMES) as Language[]).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))
	];
	const themes: Array<{ value: ThemeSetting; label: string }> = [
		{ value: 'system', label: t('settings.themeSystem') },
		{ value: 'light', label: t('settings.themeLight') },
		{ value: 'dark', label: t('settings.themeDark') }
	];
	const sections: Array<{ key: keyof AppSettings & string; label: string }> = [
		{ key: 'showSupplementTracker', label: t('tabs.tracker') },
		{ key: 'nutritionTrackerEnabled', label: t('tabs.nutrition') },
		{ key: 'showRecipes', label: t('tabs.recipes') }
	];

	async function exportBackup() {
		setBusy(true);
		try {
			await shareBackup(db);
		} catch (e) {
			Alert.alert(t('settings.exportFailed'), e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}

	async function importBackup() {
		let data: unknown;
		try {
			data = await pickBackup();
		} catch {
			return Alert.alert(t('settings.importFailed'), t('settings.importInvalid'));
		}
		if (data === null) return;

		Alert.alert(t('settings.importConfirmTitle'), t('settings.importConfirmMessage'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('settings.importConfirm'),
				style: 'destructive',
				onPress: async () => {
					setBusy(true);
					try {
						const counts = await restoreBackup(db, data);
						await reload();
						Alert.alert(t('settings.importDone'), t('settings.importDoneMessage', { lists: counts.lists ?? 0, items: counts.items ?? 0 }));
					} catch (e) {
						const message =
							e instanceof BackupError ? t(e.code === 'newer' ? 'settings.importNewer' : 'settings.importInvalid') : String(e);
						Alert.alert(t('settings.importFailed'), message);
					} finally {
						setBusy(false);
					}
				}
			}
		]);
	}

	return (
		<ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={formStyles.content} testID="settings-screen">
			<Section title={t('settings.language')}>
				{languages.map((o, i) => (
					<Choice
						key={o.value ?? 'system'}
						testID={`lang-${o.value ?? 'system'}`}
						label={o.label}
						selected={settings.lang === o.value}
						first={i === 0}
						onPress={() => update({ lang: o.value })}
					/>
				))}
			</Section>

			<Section title={t('settings.appearance')}>
				{themes.map((o, i) => (
					<Choice
						key={o.value}
						testID={`theme-${o.value}`}
						label={o.label}
						selected={settings.theme === o.value}
						first={i === 0}
						onPress={() => update({ theme: o.value })}
					/>
				))}
			</Section>

			<Section title={t('settings.lists')}>
				<Action
					first
					testID="open-category-order"
					icon="chevron-forward"
					label={t('settings.categoryOrder')}
					onPress={() => router.push('/settings/category-order')}
				/>
				<SwitchRow
					testID="toggle-showFavoriteIndicator"
					label={t('settings.showFavoriteIndicator')}
					value={settings.showFavoriteIndicator}
					onChange={(value) => update({ showFavoriteIndicator: value })}
				/>
			</Section>

			<Section title={t('settings.sections')} hint={t('settings.sectionsHint')}>
				{sections.map((s, i) => (
					<SwitchRow
						key={s.key}
						first={i === 0}
						testID={`toggle-${s.key}`}
						label={s.label}
						value={settings[s.key] !== false}
						onChange={(value) => update({ [s.key]: value })}
					/>
				))}
			</Section>

			<Section title={t('settings.backup')} hint={t('settings.backupHint')}>
				<Action first testID="backup-export" icon="share-outline" label={t('settings.export')} onPress={exportBackup} disabled={busy} />
				<Action testID="backup-import" icon="download-outline" label={t('settings.import')} onPress={importBackup} disabled={busy} />
				{busy && <ActivityIndicator style={styles.busy} color={theme.primary} />}
			</Section>

			<Section title={t('settings.about')}>
				<Row first>
					<Label>Groly</Label>
					<Text style={{ color: theme.textMuted }}>{t('settings.version', { version: Constants.expoConfig?.version ?? '?' })}</Text>
				</Row>
				<View style={[styles.disclaimer, { borderTopColor: theme.surfaceHigh }]}>
					<Text style={[styles.disclaimerTitle, { color: theme.text }]}>{t('settings.disclaimerTitle')}</Text>
					<Text style={{ color: theme.textMuted, lineHeight: 20 }}>{t('settings.disclaimer')}</Text>
				</View>
			</Section>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	busy: { paddingVertical: 12 },
	disclaimer: { padding: 16, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
	disclaimerTitle: { fontSize: 15, fontWeight: '600' }
});
