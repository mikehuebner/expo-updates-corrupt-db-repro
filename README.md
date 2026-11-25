# expo-updates: a corrupted updates database is never rebuilt (iOS)

A blank SDK 58 app (`create-expo-app --template blank`) with `expo-updates` added. It shows the reproduction for an expo-updates bug on iOS. When the updates database (`.expo-internal/expo-v*.db`) is corrupted, every launch is an emergency launch, and the file is never replaced.

The only changes from the template:

- `app.json`: `ios.bundleIdentifier`, `runtimeVersion`, and `updates`. The update URL is a placeholder. With `checkAutomatically: "NEVER"` the app never contacts it, so no EAS project or server is needed.
- `App.js`: shows `isEmergencyLaunch`, `emergencyLaunchReason`, `isEmbeddedLaunch`, and `updateId`. Its buttons corrupt the database with `expo-file-system`, or delete `.expo-internal` (the workaround).

## Steps

expo-updates only runs in Release builds.

```sh
npm install
npx expo run:ios --configuration Release            # simulator
npx expo run:ios --configuration Release --device   # physical iPhone: pick it, and set a development team when asked
```

1. The app launches normally and shows `isEmergencyLaunch: false`. Launching once creates the database.
2. Tap **Corrupt database ("file is not a database")** or **Corrupt database ("malformed")**.
3. Force-quit the app and open it again. It shows `isEmergencyLaunch: true`, and `emergencyLaunchReason` contains the SQLite error:
   - `SQLitePrepareError: (code: 26; …; message: file is not a database)`
   - `SQLiteGetResultsError: (code: 11; …; message: database disk image is malformed)`
4. Force-quit and reopen as many times as you like. Every launch is an emergency launch, and expo-updates never replaces the file. Only reinstalling the app fixes it.
5. Optional: tap **Workaround: delete .expo-internal**, then force-quit and reopen. expo-updates creates a new database and launches normally.

## Why

`UpdatesDatabaseInitialization.initializeDatabase()` moves a corrupted database aside and creates a new one only when `sqlite3_open` returns `SQLITE_CORRUPT` or `SQLITE_NOTADB`. `sqlite3_open` doesn't read the file, so it returns `SQLITE_OK` for a corrupted one. The error shows up on the first query instead, and nothing moves the file aside then.
