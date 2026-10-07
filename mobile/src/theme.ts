import { useColorScheme } from 'react-native';

// Mirrors the CSS variables in ../src/app.css
const light = {
	bg: '#f8f9fa',
	card: '#ffffff',
	surfaceHigh: '#e5e9eb',
	primary: '#2E7D32',
	primaryContainer: '#C8E6C9',
	onPrimary: '#ffffff',
	text: '#2d3335',
	textMuted: '#5a6062',
	outline: '#767c7e',
	error: '#d32f2f'
};

const dark: typeof light = {
	bg: '#111513',
	card: '#242826',
	surfaceHigh: '#202422',
	primary: '#81C784',
	primaryContainer: '#1B3920',
	onPrimary: '#0F2010',
	text: '#e8e8e8',
	textMuted: '#9a9a9a',
	outline: '#555555',
	error: '#ff6b6b'
};

export type Theme = typeof light;

export function useTheme(): Theme {
	return useColorScheme() === 'dark' ? dark : light;
}
