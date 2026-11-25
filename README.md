# expo-updates: a corrupted updates database is never rebuilt (iOS)

A blank SDK 58 app (`create-expo-app --template blank`) with `expo-updates` added. It shows the reproduction for an expo-updates bug on iOS. When the updates database (`.expo-internal/expo-v*.db`) is corrupted, every launch is an emergency launch, every update download fails, and the file is never replaced until the app is reinstalled.

The only changes from the template:

- `app.json`: `ios.bundleIdentifier`, `runtimeVersion`, and `updates` (an EAS Update project with a `repro` channel, and `checkAutomatically: "NEVER"` so updates are only checked from the button).
- `App.js`: shows which update is running, a cold-launch counter, the expo-updates launch state, the database file's header and modified time, and expo-updates errors from this launch. Its buttons check for an update, corrupt the database with `expo-file-system`, or delete `.expo-internal` (the workaround).

## Steps

expo-updates only runs in Release builds.

```sh
npm install
npx expo run:ios --configuration Release            # simulator
npx expo run:ios --configuration Release --device   # physical iPhone: pick it, and set a development team when asked
```

To publish an update (to your own EAS project, run `npx eas-cli init` and `npx eas-cli channel:create repro` first):

```sh
EXPO_PUBLIC_LABEL="Update B" npx eas-cli update --branch repro --message "Update B" --platform ios --environment production
```

1. **Updates work.** Publish "Update B", tap **Check for update**, then force-quit and reopen. The app shows **Running: Update B**.
2. **Corrupt the database.** Tap **Corrupt database ("file is not a database")** or **Corrupt database ("malformed")**, then force-quit and reopen. The app shows `isEmergencyLaunch: true` and is back on the embedded build, so the downloaded Update B is gone. The database header and modified time show the file wasn't replaced.
3. **Updates never arrive.** Publish "Update C" and tap **Check for update**. The download fails with `ERR_UPDATES_FETCH Failed to download new update: … file is not a database` (or `database disk image is malformed`). Every reopen is another emergency launch.
4. **Workaround.** Tap **Workaround: delete .expo-internal**, then force-quit and reopen. expo-updates creates a new database, **Check for update** downloads Update C, and the next reopen shows **Running: Update C**.

## Why

`UpdatesDatabaseInitialization.initializeDatabase()` moves a corrupted database aside and creates a new one only when `sqlite3_open` returns `SQLITE_CORRUPT` or `SQLITE_NOTADB`. `sqlite3_open` doesn't read the file, so it returns `SQLITE_OK` for a corrupted one. The error shows up on the first query instead, and nothing moves the file aside then.
