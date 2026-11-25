import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

// expo-updates keeps its database and assets in Library/Application Support/.expo-internal.
const updatesDirectory = new Directory(Paths.document.parentDirectory, 'Library', 'Application Support', '.expo-internal');

function corruptDatabase(mode) {
  const database = updatesDirectory.list().find((item) => item instanceof File && /^expo-v\d+\.db$/.test(item.name));
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

export default function App() {
  const [status, setStatus] = useState('');

  const run = (action) => {
    try {
      setStatus(action());
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text testID="isEmergencyLaunch">isEmergencyLaunch: {String(Updates.isEmergencyLaunch)}</Text>
      <Text testID="emergencyLaunchReason">emergencyLaunchReason: {String(Updates.emergencyLaunchReason)}</Text>
      <Text>isEmbeddedLaunch: {String(Updates.isEmbeddedLaunch)}</Text>
      <Text>updateId: {String(Updates.updateId)}</Text>
      <Button title='Corrupt database ("file is not a database")' onPress={() => run(() => corruptDatabase('notadb'))} />
      <Button title='Corrupt database ("malformed")' onPress={() => run(() => corruptDatabase('malformed'))} />
      <Button title="Workaround: delete .expo-internal" onPress={() => run(deleteUpdatesDirectory)} />
      {!!status && <Text testID="status">{status}</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
});
