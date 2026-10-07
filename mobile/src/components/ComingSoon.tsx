import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

type Props = { feature: string; icon: ComponentProps<typeof Ionicons>['name'] };

/** Placeholder for tabs whose feature ships in a later phase */
export function ComingSoon({ feature, icon }: Props) {
	const theme = useTheme();
	const { t } = useI18n();

	return (
		<View testID="coming-soon" style={styles.container}>
			<Ionicons name={icon} size={56} color={theme.primary} />
			<Text style={[styles.title, { color: theme.text }]}>{t('comingSoon.title')}</Text>
			<Text style={[styles.body, { color: theme.textMuted }]}>{t('comingSoon.body', { feature })}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
	title: { fontSize: 22, fontWeight: '700' },
	body: { fontSize: 15, textAlign: 'center', lineHeight: 22 }
});
