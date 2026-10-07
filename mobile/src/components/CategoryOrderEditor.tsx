import { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dropIndex, fromDisplay, moveInDisplay, moveIndex, toDisplay } from '@/categoryOrder';
import { categoryColor } from '@/items';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Label, Section, SwitchRow } from './Form';

// Fixed row height: drop positions are computed from the drag distance
const ROW_HEIGHT = 52;

type Props = {
	enabled: boolean;
	/** Stored (bottom-up) order */
	order: string[];
	onChange: (enabled: boolean, order: string[]) => void;
	/** The parent ScrollView should stop scrolling while a row is dragged */
	onDraggingChange?: (dragging: boolean) => void;
};

type Drag = { from: number; to: number };

/** "Group by category" switch plus the category order, top-down, reordered by dragging the handle. */
export function CategoryOrderEditor({ enabled, order, onChange, onDraggingChange }: Props) {
	const { t, category } = useI18n();
	const display = toDisplay(order);
	const [drag, setDrag] = useState<Drag | null>(null);
	const dy = useRef(new Animated.Value(0)).current;

	const save = (nextDisplay: string[]) => onChange(enabled, fromDisplay(nextDisplay));

	function startDrag(index: number) {
		dy.setValue(0);
		setDrag({ from: index, to: index });
		onDraggingChange?.(true);
	}

	function moveDrag(from: number, distance: number) {
		// Keep the lifted row inside the list
		dy.setValue(Math.max(-from * ROW_HEIGHT, Math.min((display.length - 1 - from) * ROW_HEIGHT, distance)));
		const to = dropIndex(from, distance, ROW_HEIGHT, display.length);
		setDrag((d) => (d && d.to !== to ? { ...d, to } : d));
	}

	function endDrag(from: number, distance: number) {
		const to = dropIndex(from, distance, ROW_HEIGHT, display.length);
		setDrag(null);
		dy.setValue(0);
		onDraggingChange?.(false);
		if (to !== from) save(moveIndex(display, from, to));
	}

	// Rows between the drag start and the current drop position make room
	function shift(index: number): number {
		if (!drag || index === drag.from) return 0;
		if (drag.from < drag.to && index > drag.from && index <= drag.to) return -ROW_HEIGHT;
		if (drag.from > drag.to && index >= drag.to && index < drag.from) return ROW_HEIGHT;
		return 0;
	}

	return (
		<>
			<Section>
				<SwitchRow first testID="sort-enabled" label={t('sort.groupByCategory')} value={enabled} onChange={(v) => onChange(v, order)} />
			</Section>
			{enabled && (
				<Section hint={t('sort.orderHint')}>
					{display.map((key, index) => (
						<DraggableRow
							key={key}
							categoryKey={key}
							label={category(key)}
							index={index}
							dragging={drag?.from === index}
							offset={shift(index)}
							dy={dy}
							onStart={startDrag}
							onMove={moveDrag}
							onEnd={endDrag}
							moveUpLabel={t('sort.moveUp', { category: category(key) })}
							moveDownLabel={t('sort.moveDown', { category: category(key) })}
							onStep={(delta) => save(moveInDisplay(display, key, delta))}
						/>
					))}
				</Section>
			)}
		</>
	);
}

type RowProps = {
	categoryKey: string;
	label: string;
	index: number;
	dragging: boolean;
	offset: number;
	dy: Animated.Value;
	onStart: (index: number) => void;
	onMove: (from: number, dy: number) => void;
	onEnd: (from: number, dy: number) => void;
	moveUpLabel: string;
	moveDownLabel: string;
	onStep: (delta: -1 | 1) => void;
};

function DraggableRow(props: RowProps) {
	const theme = useTheme();
	const { categoryKey, label, index, dragging, offset, dy } = props;

	// Gesture handler resolves the conflict with the surrounding ScrollView natively; a plain
	// PanResponder loses on Android because the ScrollView intercepts the move before JS can block it.
	// Callbacks read the latest props through a ref and run on the JS thread (no Reanimated needed).
	const latest = useRef(props);
	latest.current = props;
	const active = useRef(false);
	const pan = Gesture.Pan()
		.runOnJS(true)
		.minDistance(0)
		.onStart(() => {
			active.current = true;
			latest.current.onStart(latest.current.index);
		})
		.onUpdate((e) => latest.current.onMove(latest.current.index, e.translationY))
		.onFinalize((e) => {
			if (!active.current) return;
			active.current = false;
			latest.current.onEnd(latest.current.index, e.translationY);
		});

	return (
		<Animated.View
			testID={`order-row-${categoryKey}`}
			accessible
			accessibilityLabel={label}
			// Screen readers can't drag: they get "move up/down" actions instead
			accessibilityActions={[
				{ name: 'moveUp', label: props.moveUpLabel },
				{ name: 'moveDown', label: props.moveDownLabel }
			]}
			onAccessibilityAction={(e) => props.onStep(e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
			style={[
				styles.row,
				{ backgroundColor: theme.card, borderTopColor: theme.surfaceHigh },
				index === 0 && styles.first,
				dragging
					? [styles.lifted, { transform: [{ translateY: dy }], borderColor: theme.primary }]
					: { transform: [{ translateY: offset }] }
			]}
		>
			<View style={[styles.dot, { backgroundColor: categoryColor(categoryKey, theme.primary) }]} />
			<View style={styles.label}>
				<Label>{label}</Label>
			</View>
			<GestureDetector gesture={pan}>
				<View testID={`drag-${categoryKey}`} style={styles.handle}>
					<Ionicons name="reorder-three" size={26} color={dragging ? theme.primary : theme.textMuted} />
				</View>
			</GestureDetector>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	row: {
		height: ROW_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingLeft: 16,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	first: { borderTopWidth: 0 },
	lifted: {
		zIndex: 10,
		elevation: 6,
		borderWidth: 1,
		borderRadius: 10,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 }
	},
	dot: { width: 10, height: 10, borderRadius: 5 },
	label: { flex: 1 },
	handle: { width: 52, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }
});
