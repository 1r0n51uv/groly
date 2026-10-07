import { useState } from 'react';
// Gesture handler's ScrollView, so dragging a category handle wins over scrolling
import { ScrollView } from 'react-native-gesture-handler';
import { effectiveSort } from '@/categoryOrder';
import { CategoryOrderEditor } from '@/components/CategoryOrderEditor';
import { formStyles } from '@/components/Form';
import { useSettings } from '@/settings';

/** Global sorting; lists without their own order use it. */
export default function CategoryOrder() {
	const { settings, update } = useSettings();
	const sort = effectiveSort(settings);
	const [dragging, setDragging] = useState(false);

	return (
		<ScrollView contentContainerStyle={formStyles.content} scrollEnabled={!dragging}>
			<CategoryOrderEditor
				enabled={sort.enabled}
				order={sort.order}
				onChange={(enabled, order) => update({ categorySortEnabled: enabled, categoryOrder: order })}
				onDraggingChange={setDragging}
			/>
		</ScrollView>
	);
}
