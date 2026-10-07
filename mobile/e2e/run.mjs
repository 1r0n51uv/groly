// End-to-end runner: installs the release APK on a running Android emulator and runs every
// Maestro flow in ../.maestro. Each flow starts from a wiped app (launchApp clearState).
//
//   node e2e/run.mjs            run against the last built APK
//   node e2e/run.mjs --build    rebuild the APK first
//   node e2e/run.mjs 02         only flows whose file name contains "02"
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flowsDir = path.join(mobileDir, '.maestro');
const apk = path.join(mobileDir, 'android/app/build/outputs/apk/release/app-release.apk');
const isWin = process.platform === 'win32';

const args = process.argv.slice(2);
const build = args.includes('--build');
const filter = args.find((a) => !a.startsWith('--'));

const sdk = process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk');
const adb = path.join(sdk, 'platform-tools', isWin ? 'adb.exe' : 'adb');
const maestro =
	[path.join(process.env.LOCALAPPDATA ?? '', 'maestro/bin/maestro.bat'), path.join(process.env.HOME ?? '', '.maestro/bin/maestro')]
		.find(existsSync) ?? 'maestro';
const env = { ...process.env, ANDROID_HOME: sdk };

// React Native's native (CMake) build fails on JDK 24+ ("restricted method" warnings are treated
// as errors), and Android Studio now bundles JDK 25 — so prefer an installed JDK 17–21.
function findJdk() {
	if (!isWin) return env.JAVA_HOME;
	for (const base of ['C:/Program Files/Java', 'C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Microsoft']) {
		if (!existsSync(base)) continue;
		const jdk = readdirSync(base).filter((d) => /^jdk-?(17|21)[.-]/.test(d)).sort().pop();
		if (jdk) return path.join(base, jdk);
	}
	return env.JAVA_HOME;
}

// The SDK's default CMake 3.22 ships ninja 1.10, which can't handle Windows paths over 260 chars
// (deep checkouts fail with "Filename longer than 260 characters"). ninja >= 1.12 can.
function findCmake() {
	const dir = path.join(sdk, 'cmake');
	if (!existsSync(dir)) return null;
	const version = readdirSync(dir)
		.filter((v) => /^3\.(2[89]|3\d)\./.test(v))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
		.pop();
	return version ? path.join(dir, version) : null;
}

function run(cmd, cmdArgs, opts = {}) {
	const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env, shell: isWin, ...opts });
	if (res.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} exited with ${res.status}`);
	return res;
}

function buildApk() {
	const androidDir = path.join(mobileDir, 'android');
	const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

	// Prebuild rewrites the `android`/`ios` scripts to `expo run:*` (native builds, impossible for iOS
	// on Windows); keep the Expo Go-friendly `expo start --*` scripts.
	const pkgPath = path.join(mobileDir, 'package.json');
	const pkg = readFileSync(pkgPath, 'utf8');
	try {
		run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'], {
			cwd: mobileDir,
			env: { ...env, CI: '1' }
		});
	} finally {
		writeFileSync(pkgPath, pkg);
	}

	const cmake = findCmake();
	if (cmake) {
		writeFileSync(path.join(androidDir, 'local.properties'), `cmake.dir=${cmake.replaceAll('\\', '/')}\n`);
	} else if (isWin) {
		console.warn('No Android SDK CMake >= 3.28 found; native builds may hit the 260-char path limit.');
	}
	// Kotlin compiles in-process below, which needs more than the template's 512 MB metaspace
	const props = path.join(androidDir, 'gradle.properties');
	writeFileSync(
		props,
		readFileSync(props, 'utf8').replace(/^org\.gradle\.jvmargs=.*$/m, 'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g')
	);

	// Emulators are x86_64; building one ABI is ~4x faster. No Gradle/Kotlin daemons: on Windows a
	// lingering daemon keeps build outputs locked and the next `prebuild --clean` fails with EBUSY.
	run(
		gradlew,
		['assembleRelease', '-PreactNativeArchitectures=x86_64', '--no-daemon', '-Pkotlin.compiler.execution.strategy=in-process', '--console=plain'],
		{ cwd: androidDir, env: { ...env, JAVA_HOME: findJdk() } }
	);
}

function main() {
	const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' }).stdout ?? '';
	if (!/\tdevice$/m.test(devices)) {
		throw new Error('No Android device/emulator connected. Start one, e.g.: emulator -avd groly_e2e');
	}

	if (build) buildApk();
	if (!existsSync(apk)) throw new Error(`APK not found at ${apk}. Run with --build first.`);
	run(adb, ['install', '-r', apk]);

	const flows = readdirSync(flowsDir)
		.filter((f) => f.endsWith('.yaml') && (!filter || f.includes(filter)))
		.sort();
	const outputRoot = path.join(mobileDir, 'e2e/output');
	rmSync(outputRoot, { recursive: true, force: true });

	const failed = [];
	for (const flow of flows) {
		console.log(`\n▶ ${flow}`);
		// Screenshots, logs and the UI hierarchy on failure land here
		const outDir = path.join(outputRoot, path.basename(flow, '.yaml'));
		mkdirSync(outDir, { recursive: true });
		const res = spawnSync(
			maestro,
			['test', path.join(flowsDir, flow), '--test-output-dir', outDir, '--debug-output', outDir, '--flatten-debug-output'],
			{ stdio: 'inherit', env: { ...env, MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true' }, shell: isWin, cwd: mobileDir }
		);
		if (res.status !== 0) failed.push(flow);
	}

	console.log(`\n${flows.length - failed.length}/${flows.length} flows passed (artifacts: e2e/output)`);
	if (failed.length) {
		console.log(`Failed: ${failed.join(', ')}`);
		process.exit(1);
	}
}

try {
	main();
} catch (e) {
	console.error(e.message);
	process.exit(1);
}
