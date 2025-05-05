// RootLayout.tsx
import { Slot, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function RootLayout() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();



  useEffect(() => {
    let mounted = true;

    async function checkAuthAndRegister() {
      // --- AUTH BOUNCE ---
      const token = await AsyncStorage.getItem('token');
      if (!mounted) return;
      setLoggedIn(!!token);
      router.replace(token ? '/(tabs)' : '/(auth)/login');

      // --- PUSH REGISTRATION ---
      if (Device.isDevice) {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
          console.log('Expo Push Token:', expoPushToken);
          // TODO: send `expoPushToken` up to your backend tied to the current user
        } else {
          console.warn('Push notification permission not granted!');
        }
      } else {
        console.warn('Must use a physical device for Push Notifications');
      }

      // Optional: configure how your app handles notifications when received
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Listen for foreground notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification Received:', notification);
      });
      // Listen for user taps on notifications
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification Response:', response);
        // maybe deep-link or navigate somewhere
      });
    }

    checkAuthAndRegister();

    return () => {
      mounted = false;
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)   Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return <Slot />;
}
