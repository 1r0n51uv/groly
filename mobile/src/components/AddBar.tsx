import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { applySuggestion, suggestionQuery } from '@/items';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

type Props = {
	placeholder: string;
	onSubmit: (text: string) => void;
	inputTestID: string;
	buttonTestID: string;
	/** Previously used names for what's being typed; tapping one adds it right away */
	getSuggestions?: (query: string) => Promise<string[]>;
	/** Extra button left of the input (e.g. favourites) */
	leading?: ReactNode;
};

// Bottom input bar; place inside a KeyboardAvoidingView so it stays above the keyboard.
export function AddBar({ placeholder, onSubmit, inputTestID, buttonTestID, getSuggestions, leading }: Props) {
	const theme = useTheme();
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const [text, setText] = useState('');
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const request = useRef(0);

	useEffect(() => {
		const query = suggestionQuery(text);
		const current = ++request.current;
		if (!getSuggestions || !query) return setSuggestions([]);
		// Ignore answers to older keystrokes that arrive late
		getSuggestions(query).then((names) => current === request.current && setSuggestions(names));
	}, [text, getSuggestions]);

	function submit(value = text) {
		const trimmed = value.trim();
		if (!trimmed) return;
		setText('');
		onSubmit(trimmed);
	}

	return (
		<View style={[styles.wrap, { backgroundColor: theme.bg, borderTopColor: theme.surfaceHigh, paddingBottom: Math.max(insets.bottom, 12) }]}>
			{suggestions.length > 0 && (
				<ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
					{suggestions.map((name) => (
						<Pressable
							key={name}
							testID={`suggestion-${name}`}
							onPress={() => submit(applySuggestion(text, name))}
							style={[styles.chip, { backgroundColor: theme.primaryContainer }]}
							accessibilityRole="button"
						>
							<Text style={{ color: theme.primary, fontWeight: '600' }}>{name}</Text>
						</Pressable>
					))}
				</ScrollView>
			)}
			<View style={styles.bar}>
				{leading}
				<TextInput
					testID={inputTestID}
					style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
					placeholder={placeholder}
					placeholderTextColor={theme.textMuted}
					value={text}
					onChangeText={setText}
					onSubmitEditing={() => submit()}
					submitBehavior="submit"
					returnKeyType="done"
				/>
				<Pressable
					testID={buttonTestID}
					onPress={() => submit()}
					style={[styles.button, { backgroundColor: theme.primary }]}
					accessibilityRole="button"
					accessibilityLabel={t('common.add')}
				>
					<Text style={[styles.buttonText, { color: theme.onPrimary }]}>+</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
	chips: { paddingHorizontal: 16, gap: 8 },
	chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
	bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
	input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
	button: { width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	buttonText: { fontSize: 26, fontWeight: '600', lineHeight: 28 }
});
