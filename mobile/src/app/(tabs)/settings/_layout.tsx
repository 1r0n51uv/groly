import { Stack } from 'expo-router';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function SettingsLayout() {
	const theme = useTheme();
	const { t } = useI18n();

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: theme.bg },
				headerTintColor: theme.primary,
				headerTitleStyle: { color: theme.text },
				headerShadowVisible: false,
				contentStyle: { backgroundColor: theme.bg }
			}}
		>
			<Stack.Screen name="index" options={{ title: t('tabs.settings'), headerLargeTitle: true }} />
			<Stack.Screen name="category-order" options={{ title: t('settings.categoryOrder') }} />
		</Stack>
	);
}
