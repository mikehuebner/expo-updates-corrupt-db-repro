import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

export default function App() {
  return (
    <View style={styles.container}>
      <Text testID="isEmergencyLaunch">isEmergencyLaunch: {String(Updates.isEmergencyLaunch)}</Text>
      <Text testID="emergencyLaunchReason">emergencyLaunchReason: {String(Updates.emergencyLaunchReason)}</Text>
      <Text>isEmbeddedLaunch: {String(Updates.isEmbeddedLaunch)}</Text>
      <Text>updateId: {String(Updates.updateId)}</Text>
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
