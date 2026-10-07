import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { DATABASE_NAME, cleanupOldData, migrate, type Db } from '@/db';
import { SettingsProvider } from '@/settings';

async function initDatabase(db: Db) {
	await migrate(db);
	// Same retention as the server: old checked items and stale suggestions
	await cleanupOldData(db);
}

export default function RootLayout() {
	return (
		<SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
			<SettingsProvider>
				<StatusBar style="auto" />
				<Stack screenOptions={{ headerShown: false }} />
			</SettingsProvider>
		</SQLiteProvider>
	);
}
