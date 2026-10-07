import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';

// Grouped-list building blocks shared by Settings and the list/item option screens

export function Section({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
	const theme = useTheme();
	return (
		<View style={styles.section}>
			{title ? <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text> : null}
			<View style={[styles.card, { backgroundColor: theme.card }]}>{children}</View>
			{hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
		</View>
	);
}

export function Row({ first, children }: { first?: boolean; children: ReactNode }) {
	const theme = useTheme();
	return (
		<View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.surfaceHigh }]}>
			{children}
		</View>
	);
}

export function Label({ children, color }: { children: ReactNode; color?: string }) {
	const theme = useTheme();
	return (
		<Text style={[styles.label, { color: color ?? theme.text }]} numberOfLines={1}>
			{children}
		</Text>
	);
}

type ChoiceProps = { label: string; selected: boolean; first?: boolean; onPress: () => void; testID: string; leading?: ReactNode };

export function Choice({ label, selected, first, onPress, testID, leading }: ChoiceProps) {
	const theme = useTheme();
	return (
		<Pressable testID={testID} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
			<Row first={first}>
				<View style={styles.leading}>
					{leading}
					<Label>{label}</Label>
				</View>
				{selected && <Ionicons name="checkmark" size={20} color={theme.primary} />}
			</Row>
		</Pressable>
	);
}

type SwitchRowProps = { label: string; value: boolean; onChange: (value: boolean) => void; first?: boolean; testID: string };

export function SwitchRow({ label, value, onChange, first, testID }: SwitchRowProps) {
	const theme = useTheme();
	return (
		<Row first={first}>
			<Label>{label}</Label>
			<Switch testID={testID} value={value} onValueChange={onChange} trackColor={{ true: theme.primary }} />
		</Row>
	);
}

type ActionProps = {
	label: string;
	icon: ComponentProps<typeof Ionicons>['name'];
	onPress: () => void;
	first?: boolean;
	disabled?: boolean;
	destructive?: boolean;
	testID: string;
};

/** Tappable row; chevron-forward icon makes it a navigation link */
export function Action({ label, icon, onPress, first, disabled, destructive, testID }: ActionProps) {
	const theme = useTheme();
	const color = disabled ? theme.textMuted : destructive ? theme.error : theme.primary;
	return (
		<Pressable testID={testID} onPress={onPress} disabled={disabled} accessibilityRole="button">
			<Row first={first}>
				<Label color={icon === 'chevron-forward' ? theme.text : color}>{label}</Label>
				<Ionicons name={icon} size={20} color={icon === 'chevron-forward' ? theme.textMuted : color} />
			</Row>
		</Pressable>
	);
}

export const formStyles = StyleSheet.create({
	content: { padding: 16, paddingBottom: 40 },
	input: { fontSize: 16, flex: 1, paddingVertical: 14 }
});

const styles = StyleSheet.create({
	section: { marginBottom: 24 },
	sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
	card: { borderRadius: 14, overflow: 'hidden' },
	row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 50, gap: 12 },
	leading: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
	label: { fontSize: 16, flexShrink: 1 },
	hint: { fontSize: 13, marginTop: 8, marginHorizontal: 4, lineHeight: 18 }
});
