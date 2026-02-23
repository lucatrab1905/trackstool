import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../lib/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
