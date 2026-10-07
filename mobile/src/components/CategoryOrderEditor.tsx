import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fromDisplay, moveInDisplay, toDisplay } from '@/categoryOrder';
import { categoryColor } from '@/items';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Label, Row, Section, SwitchRow } from './Form';

type Props = {
	enabled: boolean;
	/** Stored (bottom-up) order */
	order: string[];
	onChange: (enabled: boolean, order: string[]) => void;
};

/** "Group by category" switch plus the category order, top-down, with up/down buttons. */
export function CategoryOrderEditor({ enabled, order, onChange }: Props) {
	const theme = useTheme();
	const { t, category } = useI18n();
	const display = toDisplay(order);

	const move = (key: string, delta: -1 | 1) => onChange(enabled, fromDisplay(moveInDisplay(display, key, delta)));

	return (
		<>
			<Section>
				<SwitchRow first testID="sort-enabled" label={t('sort.groupByCategory')} value={enabled} onChange={(v) => onChange(v, order)} />
			</Section>
			{enabled && (
				<Section hint={t('sort.orderHint')}>
					{display.map((key, i) => (
						<Row key={key} first={i === 0}>
							<View testID={`order-row-${key}`} style={styles.name}>
								<View style={[styles.dot, { backgroundColor: categoryColor(key, theme.primary) }]} />
								<Label>{category(key)}</Label>
							</View>
							<View style={styles.buttons}>
								<MoveButton
									testID={`move-up-${key}`}
									icon="chevron-up"
									label={t('sort.moveUp', { category: category(key) })}
									disabled={i === 0}
									onPress={() => move(key, -1)}
								/>
								<MoveButton
									testID={`move-down-${key}`}
									icon="chevron-down"
									label={t('sort.moveDown', { category: category(key) })}
									disabled={i === display.length - 1}
									onPress={() => move(key, 1)}
								/>
							</View>
						</Row>
					))}
				</Section>
			)}
		</>
	);
}

type MoveProps = { testID: string; icon: 'chevron-up' | 'chevron-down'; label: string; disabled: boolean; onPress: () => void };

function MoveButton({ testID, icon, label, disabled, onPress }: MoveProps) {
	const theme = useTheme();
	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			disabled={disabled}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={[styles.move, { backgroundColor: theme.surfaceHigh, opacity: disabled ? 0.35 : 1 }]}
		>
			<Ionicons name={icon} size={18} color={theme.text} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	name: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
	dot: { width: 10, height: 10, borderRadius: 5 },
	buttons: { flexDirection: 'row', gap: 8 },
	move: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }
});
