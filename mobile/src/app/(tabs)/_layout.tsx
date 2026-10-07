import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '@/i18n';
import { useSettings } from '@/settings';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: string) =>
	function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
		return <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={size} color={color} />;
	};

export default function TabLayout() {
	const theme = useTheme();
	const { t } = useI18n();
	const { settings } = useSettings();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: theme.primary,
				tabBarInactiveTintColor: theme.textMuted,
				tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.surfaceHigh },
				headerStyle: { backgroundColor: theme.bg },
				headerTitleStyle: { color: theme.text },
				headerShadowVisible: false,
				sceneStyle: { backgroundColor: theme.bg }
			}}
		>
			{/* Has its own stack (overview → list) with its own header */}
			<Tabs.Screen
				name="(lists)"
				options={{ title: t('tabs.lists'), headerShown: false, tabBarIcon: icon('list'), tabBarButtonTestID: 'tab-lists' }}
			/>
			{/* Feature flags: href null hides the tab, the data stays */}
			<Tabs.Screen
				name="tracker"
				options={{
					title: t('tabs.tracker'),
					tabBarIcon: icon('pulse'),
					href: settings.showSupplementTracker ? undefined : null,
					tabBarButtonTestID: 'tab-tracker'
				}}
			/>
			<Tabs.Screen
				name="nutrition"
				options={{
					title: t('tabs.nutrition'),
					tabBarIcon: icon('nutrition'),
					href: settings.nutritionTrackerEnabled ? undefined : null,
					tabBarButtonTestID: 'tab-nutrition'
				}}
			/>
			<Tabs.Screen
				name="recipes"
				options={{
					title: t('tabs.recipes'),
					tabBarIcon: icon('book'),
					href: settings.showRecipes ? undefined : null,
					tabBarButtonTestID: 'tab-recipes'
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{ title: t('tabs.settings'), headerShown: false, tabBarIcon: icon('settings'), tabBarButtonTestID: 'tab-settings' }}
			/>
		</Tabs>
	);
}
