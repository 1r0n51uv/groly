import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'$lib': path.resolve(import.meta.dirname, '../src/lib'),
			'@': path.resolve(import.meta.dirname, 'src'),
			// Native module: node's WebCrypto provides the same randomUUID
			'expo-crypto': path.resolve(import.meta.dirname, 'src/test/expoCrypto.ts')
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
