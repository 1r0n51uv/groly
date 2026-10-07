import { ScrollView } from 'react-native';
import { effectiveSort } from '@/categoryOrder';
import { CategoryOrderEditor } from '@/components/CategoryOrderEditor';
import { formStyles } from '@/components/Form';
import { useSettings } from '@/settings';

/** Global sorting; lists without their own order use it. */
export default function CategoryOrder() {
	const { settings, update } = useSettings();
	const sort = effectiveSort(settings);

	return (
		<ScrollView contentContainerStyle={formStyles.content}>
			<CategoryOrderEditor
				enabled={sort.enabled}
				order={sort.order}
				onChange={(enabled, order) => update({ categorySortEnabled: enabled, categoryOrder: order })}
			/>
		</ScrollView>
	);
}
