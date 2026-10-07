import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { createBackup, type Db } from '@/db';

/** Writes a backup to the cache and opens the share sheet (Save to Files, AirDrop, mail, …). */
export async function shareBackup(db: Db) {
	const date = new Date().toISOString().slice(0, 10);
	const file = new File(Paths.cache, `groly-backup-${date}.json`);
	if (file.exists) file.delete();
	file.create();
	file.write(JSON.stringify(await createBackup(db)));
	await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Groly backup' });
}

/** Lets the user pick a backup file; returns its parsed JSON, or null if they cancelled. */
export async function pickBackup(): Promise<unknown | null> {
	const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
	if (result.canceled) return null;
	return JSON.parse(await new File(result.assets[0].uri).text());
}
