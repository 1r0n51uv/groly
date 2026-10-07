// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reuse pure TS modules from the web app (e.g. category resolution) via `$lib/...`
const sharedLib = path.resolve(__dirname, '../src/lib');
config.watchFolders = [sharedLib];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (moduleName.startsWith('$lib/')) {
		return context.resolveRequest(context, path.join(sharedLib, moduleName.slice(5)), platform);
	}
	return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
