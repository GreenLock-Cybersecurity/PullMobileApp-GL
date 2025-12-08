import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';
import { Image } from 'expo-image';
import { notificationService } from '@/services/notificationService';
import '@/global.css';

const preloadCriticalImages = async () => {
  try {
    await Promise.all([
      Image.prefetch(require('../assets/logo.png')),
      Image.prefetch(require('../assets/fondo.webp')),
    ]);
  } catch {
  }
};

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const segments = useSegments();

  const { initializeAuth, isInitialized, isAuthenticated } = useAuthStore(
    useShallow((state) => ({
      initializeAuth: state.initializeAuth,
      isInitialized: state.isInitialized,
      isAuthenticated: state.isAuthenticated,
    }))
  );

  useEffect(() => {
    preloadCriticalImages();
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNotificationResponse = (response) => {
      const data = response.notification.request.content.data;

      if (data?.type === 'group_reservation' && data?.reservation_id) {
        router.navigate({
          pathname: '/(tabs)/ReservasList/GroupReservaDetalle',
          params: { id: data.reservation_id },
        });
      } else if (data?.type === 'booking' && data?.booking_id) {
        router.navigate({
          pathname: '/(tabs)/ReservasList/ReservaDetalle',
          params: { id: data.booking_id },
        });
      } else {
        router.navigate('/(tabs)/ReservasList');
      }
    };

    notificationService.setupNotificationListeners(
      null,
      handleNotificationResponse
    );

    return () => {
      notificationService.removeNotificationListeners();
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)/EventosList');
    } else if (!isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isInitialized, isAuthenticated, segments]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <StatusBar style="light" backgroundColor="#000000" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor="#000000" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
});
