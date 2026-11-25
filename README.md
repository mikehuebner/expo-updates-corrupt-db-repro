# expo-updates: a corrupted updates database is never rebuilt (iOS)

A blank SDK 58 app (`create-expo-app --template blank`) with `expo-updates` added. It shows the reproduction for an expo-updates bug on iOS. When the updates database (`.expo-internal/expo-v*.db`) is corrupted, every launch is an emergency launch, and the file is never replaced.

The only changes from the template:

- `app.json`: `ios.bundleIdentifier`, `runtimeVersion`, and `updates`. The update URL is a placeholder. With `checkAutomatically: "NEVER"` the app never contacts it, so no EAS project or server is needed.
- `App.js`: shows `isEmergencyLaunch`, `emergencyLaunchReason`, `isEmbeddedLaunch`, and `updateId`.
- `corrupt-db.sh`: corrupts the database of the app on the booted simulator.

## Steps

```sh
npm install
npx expo run:ios --configuration Release   # expo-updates only runs in Release builds
```

1. The app launches normally and shows `isEmergencyLaunch: false`. Launching once creates the database.
2. Corrupt the database. The script terminates the app first.

   ```sh
   ./corrupt-db.sh notadb      # SQLite: "file is not a database"
   # or
   ./corrupt-db.sh malformed   # SQLite: "database disk image is malformed"
   ```

3. Launch the app from the home screen. It shows `isEmergencyLaunch: true`, and `emergencyLaunchReason` contains the SQLite error.
4. Kill and relaunch the app as many times as you like. Every launch is an emergency launch, and the database file is never replaced. Only reinstalling the app fixes it.

## Why

`UpdatesDatabaseInitialization.initializeDatabase()` moves a corrupted database aside and creates a new one only when `sqlite3_open` returns `SQLITE_CORRUPT` or `SQLITE_NOTADB`. `sqlite3_open` doesn't read the file, so it returns `SQLITE_OK` for a corrupted one. The error shows up on the first query instead, and nothing moves the file aside then.
