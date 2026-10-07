import type { ComponentProps } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getListIcon, type ListIconId } from '$lib/listIcons';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Native stand-ins for the web app's SVG list icons (same ids, same colours)
const IONICON: Record<ListIconId, IconName> = {
	supermarkt: 'cart',
	drogerie: 'bag-handle',
	bio: 'leaf',
	baeckerei: 'basket',
	haushalt: 'home',
	apotheke: 'medkit',
	online: 'globe',
	laden: 'storefront',
	rezept: 'book'
};

export function ListIcon({ iconId, size = 36 }: { iconId: string | null; size?: number }) {
	const icon = getListIcon(iconId);
	if (!icon) return null;
	return (
		<View
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: `${icon.color}22`,
				alignItems: 'center',
				justifyContent: 'center'
			}}
		>
			<Ionicons name={IONICON[icon.id]} size={size * 0.55} color={icon.color} />
		</View>
	);
}
