# Groly Mobile (Expo)

Standalone iOS/Android version of Groly. Everything is **stored on the device** (SQLite via
`expo-sqlite`): no server, no account, no network access.

**Status: phases 0 (foundation) and 1 (shopping lists) done.** In the app today:

- **Lists:** create, rename, delete, pick an icon, remove checked items
- **Items:** grouped by category (resolver shared with the web app via `../src/lib`, recognises
  German, English and Italian names), tap to check off, quick-add `2x Milk, 500g Beef, Bread`
- **Edit sheet** (long-press an item): name, quantity, category, favourite, delete. A picked category
  is remembered for that name, like on the server
- **Suggestions** while typing, from names you used before (recent first; unused for 6 months → gone)
- **Favourites:** star in the edit sheet, dot on the item (can be turned off), panel to re-add them
- **Category order:** drag categories by their handle, globally (Settings) or per list (list
  options), or switch grouping off. Screen readers get "move up / move down" actions instead
- **Clean-up at start:** checked items older than 60 days are removed (same as the server)
- **Tabs:** Lists · Tracker · Nutrition · Recipes · Settings. Tracker, Nutrition and Recipes are
  placeholders until their phase; each can be hidden in Settings
- **Languages:** English, German, Italian — follows the device, or pick one in Settings
- **Appearance:** system / light / dark, applied app-wide (also native alerts and keyboard)
- **Backup:** export all data as JSON through the share sheet, import it on any device

Roadmap: 2 trackers → 3 recipes & meal planner → 4 nutrition → 5 extras.
Deferred (need an external server): sync/sharing, barcode product lookup, Open Food Facts search,
recipe import by URL.

## Project layout

| Path | What |
| --- | --- |
| `src/app/` | Screens (Expo Router). `(tabs)/(lists)/` is the Lists tab with its own stack |
| `src/db/` | Data layer: `schema.ts` (migrations), `lists.ts`, `history.ts`, `favorites.ts`, `settings.ts`, `backup.ts` |
| `src/categoryOrder.ts` | Category order: stored bottom-up like the web app, shown top-down |
| `src/i18n/` | `en.ts` (source of truth), `de.ts`, `it.ts`, `core.ts` (pure helpers), `index.ts` (hook) |
| `src/settings.tsx` | Settings context; applies the theme |
| `.maestro/` | End-to-end flows |
| `src/**/*.test.ts` | Unit and database tests |

### Database rules

- **Schema changes:** append a step to `MIGRATIONS` in `src/db/schema.ts`; never edit a step that
  shipped. The upgrade tests check every past version upgrades without losing data.
- **Sync-ready** (a sync with a Groly server must stay possible): table/column names mirror the server
  schema, IDs are 32 hex chars, timestamps are Unix seconds, every write bumps `updated_at`, and
  settings are stored as the server's `users.settings` JSON (same keys as the web `UserSettings`,
  unknown keys are preserved).
- **Foreign keys are off** on the device (SQLite default), so `ON DELETE CASCADE` never fires —
  delete children explicitly. The test database is configured the same way.

### Translations

Add a key to `src/i18n/en.ts` first; TypeScript then refuses `de.ts`/`it.ts` until they have it,
and the tests check for empty strings and mismatched `{placeholders}`. Category and list-icon names come
from the web app (DE/EN) plus Italian ones in `core.ts`. Italian *item names* are recognised by the
shared resolver (`../src/lib/categories.ts`, `itemResolver.ts`), so the web app benefits too.

## 1. Run on your iPhone (Expo Go)

```sh
cd mobile
npm install
npx expo start
```

Install **Expo Go** from the App Store and scan the QR code with the Camera app. Phone and PC must
be on the same network. If "Opening project…" times out:

- iPhone **Settings → Privacy & Security → Local Network → Expo Go** must be on.
- Office/guest Wi-Fi often blocks device-to-device traffic: use your iPhone's Personal Hotspot, or
  `npx expo start --tunnel`.
- Check from Safari on the phone: `http://<PC-IP>:8081/status` should say `packager-status:running`.

Don't press `w` / open `localhost:8081` in a browser: web isn't set up for this app.

## 2. Checks

```sh
npm run typecheck     # TypeScript
npm test              # unit + database tests (Vitest, real SQL via better-sqlite3)
npx expo-doctor       # dependency/config sanity
npx expo export --platform ios   # verifies Metro can bundle (incl. shared ../src/lib)
```

GitHub Actions (`.github/workflows/mobile.yml`) runs typecheck, tests and expo-doctor on every
change to `mobile/` or `src/lib/`.

`react-dom` is pinned to the `react` version on purpose: several Expo packages declare it as an
optional peer, and without the pin npm picks a newer `react-dom` and `expo install` fails with ERESOLVE.

### End-to-end tests (Android emulator + Maestro)

Flows live in `.maestro/`, drive the real release build, and each starts from a wiped app:

| Flow | Covers |
| --- | --- |
| `01_lists` | Empty state, create lists, open count, long-press delete |
| `02_shopping_list` | Quick-add (`Bananen, 2x Milch`, `500g Hackfleisch, Brot`), category grouping, check off, long-press delete, overview count |
| `03_persistence` | Lists, items and checked state survive a cold start |
| `04_language` | Switch to Italian (UI, tabs, category names), survives a restart, back to device language |
| `05_sections_and_theme` | Hide/show a tab (persisted), dark mode screenshots |
| `06_item_edit` | Edit quantity/name, pick a category, the category is remembered on another list |
| `07_suggestions_favorites` | Suggestion chip adds an item, favourite dot, re-add from the panel, dot setting |
| `08_list_options` | Rename, icon, remove checked, drag a category in a list's own order, grouping off |

```sh
emulator -avd groly_e2e -no-window -memory 4096 -cores 4 -gpu swiftshader_indirect   # once
npm run e2e:build    # prebuild + native build + install + all flows (~4 min)
npm run e2e          # reuse the last APK (JS changes need e2e:build: the bundle is embedded)
npm run e2e -- 02    # only flows whose file name contains "02"
```

Screenshots and logs are written to `e2e/output/`.

Requirements: Android SDK with an emulator image, [Maestro](https://docs.maestro.dev) (looked up in
`%LOCALAPPDATA%\maestro` or `~/.maestro`), and on Windows:
- **JDK 17–21** (Android Studio bundles JDK 25, which breaks React Native's CMake step) — the runner picks one from `C:\Program Files\Java` automatically.
- **SDK CMake ≥ 3.28** (`android sdk install cmake/3.31.6`) — the default 3.22 ships a ninja that fails on paths over 260 chars.
- Give the emulator ≥ 4 GB RAM; with the default 2 GB its adb connection drops under test load.

iOS can't be emulated on Windows. The same flows can run on an iOS simulator via EAS Workflows
(`type: maestro`) — not set up yet.

## 3. Install a real build on your iPhone (TestFlight)

Needs an Apple Developer account and an Expo account. Builds run in the cloud, so this works from Windows.

```sh
npm install -g eas-cli
eas login
eas init                                   # links the project, writes the projectId
eas build --platform ios --profile production
eas submit --platform ios --latest         # uploads to App Store Connect → TestFlight
```

Change `ios.bundleIdentifier` in `app.json` to one you own before the first build.
