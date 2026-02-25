import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Colors, UI } from '@/constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login-sheet"
          options={{
            presentation: 'formSheet',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            headerShown: false,
            contentStyle: styles.loginSheetContent,
            sheetGrabberVisible: true,
            sheetAllowedDetents: [UI.loginSheet.heightRatio],
            sheetInitialDetentIndex: 0,
            sheetExpandsWhenScrolledToEdge: true,
            sheetCornerRadius: 20,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  loginSheetContent: {
    backgroundColor: Colors.light.background,
    flex: 1,
  },
});
