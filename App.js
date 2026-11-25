import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

// Set when publishing: EXPO_PUBLIC_LABEL="Update B" npx eas-cli update --branch repro --message "Update B"
const LABEL = process.env.EXPO_PUBLIC_LABEL ?? 'Embedded build';

// expo-updates keeps its database and assets in Library/Application Support/.expo-internal.
const updatesDirectory = new Directory(Paths.document.parentDirectory, 'Library', 'Application Support', '.expo-internal');

// Counts cold launches, so a recording shows that each reopen is a new process.
const launchFile = new File(Paths.document, 'launch-count.txt');
if (!launchFile.exists) launchFile.create();
const launchCount = Number(launchFile.textSync() || 0) + 1;
launchFile.write(String(launchCount));
const launchTime = new Date().toLocaleTimeString();

function findDatabase() {
  if (!updatesDirectory.exists) return undefined;
  return updatesDirectory.list().find((item) => item instanceof File && /^expo-v\d+\.db$/.test(item.name));
}

function describeDatabase() {
  const database = findDatabase();
  if (!database) return 'no database file';
  const header = String.fromCharCode(...database.bytesSync().slice(0, 15));
  const { size, modificationTime } = database.info();
  return `${database.name}: header "${header}", ${size} bytes, modified ${new Date(modificationTime).toLocaleTimeString()}`;
}

function corruptDatabase(mode) {
  const database = findDatabase();
  const bytes = database.bytesSync();
  if (mode === 'notadb') {
    // Overwrite the 16-byte SQLite header. SQLite then reports "file is not a database".
    bytes.fill(0x58, 0, 16);
  } else {
    // Keep the file header, and break the b-tree header of every page from page 2 on.
    // SQLite then reports "database disk image is malformed".
    const pageSize = (bytes[16] << 8) | bytes[17];
    for (let offset = pageSize; offset < bytes.length; offset += pageSize) {
      bytes.fill(0xff, offset, offset + 8);
    }
  }
  database.write(bytes);
  return `Corrupted ${database.name}. Force-quit the app and open it again.`;
}

function deleteUpdatesDirectory() {
  updatesDirectory.delete();
  return 'Deleted .expo-internal. Force-quit the app and open it again.';
}

async function checkForUpdate() {
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'No new update on the "repro" channel.';
  const fetched = await Updates.fetchUpdateAsync();
  return fetched.isNew
    ? 'Downloaded a new update. Force-quit the app and open it again to run it.'
    : 'Fetched, but expo-updates reports it as not new.';
}

export default function App() {
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Native expo-updates errors from this launch, such as the SQLite error behind an emergency launch.
    Updates.readLogEntriesAsync(60_000)
      .then((entries) => setErrors(entries.filter((entry) => entry.level === 'error' || entry.level === 'fatal').slice(-3)))
      .catch((error) => setErrors([{ message: `readLogEntriesAsync failed: ${error.message}` }]));
  }, []);

  const run = async (action) => {
    setStatus('…');
    try {
      setStatus(await action());
    } catch (error) {
      setStatus(`Error: ${error.code ?? ''} ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Running: {LABEL}</Text>
      <Text>
        Cold launch #{launchCount} at {launchTime}
      </Text>
      <Text testID="isEmergencyLaunch" style={Updates.isEmergencyLaunch && styles.alert}>
        isEmergencyLaunch: {String(Updates.isEmergencyLaunch)}
      </Text>
      <Text testID="emergencyLaunchReason">emergencyLaunchReason: {String(Updates.emergencyLaunchReason)}</Text>
      <Text>isEmbeddedLaunch: {String(Updates.isEmbeddedLaunch)}</Text>
      <Text style={styles.small}>updateId: {String(Updates.updateId)}</Text>
      <Text style={styles.small}>{describeDatabase()}</Text>
      <Text style={styles.small}>
        expo-updates errors this launch:{' '}
        {errors.length === 0 ? 'none' : errors.map((entry) => `\n• ${entry.message}`).join('')}
      </Text>
      <Button title="Check for update" onPress={() => run(checkForUpdate)} />
      <Button title='Corrupt database ("file is not a database")' onPress={() => run(() => corruptDatabase('notadb'))} />
      <Button title='Corrupt database ("malformed")' onPress={() => run(() => corruptDatabase('malformed'))} />
      <Button title="Workaround: delete .expo-internal" onPress={() => run(deleteUpdatesDirectory)} />
      {!!status && <Text testID="status">{status}</Text>}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  alert: {
    color: '#c00',
    fontWeight: 'bold',
  },
  small: {
    fontSize: 12,
    color: '#555',
  },
});
