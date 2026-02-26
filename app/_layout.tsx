import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { initDatabase } from '../lib/database';

ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
  if (isFatal) {
    setFatalError(error.message + '\n' + error.stack);
  }
});

let setFatalError: (msg: string) => void = () => {};

export default function RootLayout() {
  const [fatalError, setError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setFatalError = setError;
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e: any) => setError('DB init failed: ' + String(e)));
  }, []);

  if (fatalError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Crash Report</Text>
        <ScrollView>
          <Text style={styles.errorText} selectable>{fatalError}</Text>
        </ScrollView>
      </View>
    );
  }

  if (!dbReady) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: '#1a1a1a', padding: 24, paddingTop: 60 },
  errorTitle: { color: '#ff4444', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  errorText: { color: '#ffffff', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});
