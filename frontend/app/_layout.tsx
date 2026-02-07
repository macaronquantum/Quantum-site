import { Stack } from 'expo-router';
import { WalletProvider } from '../contexts/WalletContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="opportunity/[id]" />
        </Stack>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
