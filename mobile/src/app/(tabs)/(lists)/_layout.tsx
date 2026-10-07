import { Stack } from 'expo-router';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function ListsLayout() {
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
			<Stack.Screen name="index" options={{ title: t('tabs.lists'), headerLargeTitle: true }} />
			<Stack.Screen name="list/[id]/index" options={{ title: '' }} />
			<Stack.Screen name="list/[id]/options" options={{ title: t('listOptions.title') }} />
			<Stack.Screen name="list/[id]/item/[itemId]" options={{ title: t('item.title'), presentation: 'modal' }} />
			<Stack.Screen name="list/[id]/favorites" options={{ title: t('favorites.title'), presentation: 'modal' }} />
		</Stack>
	);
}
