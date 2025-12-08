import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="EventosList"
        options={{
          title: 'Events',
          tabBarIcon: ({ size, color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ReservasList"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ size, color, focused }) => (
            <Ionicons
              name={focused ? 'ticket' : 'ticket-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ size, color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="EmpleadosList"
        options={{
          title: 'Employees',
          tabBarIcon: ({ size, color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
          href: user?.role === 'admin' ? '/(tabs)/EmpleadosList' : null,
        }}
      />
      <Tabs.Screen
        name="Logout"
        options={{
          title: 'Logout',
          tabBarIcon: ({ size, color, focused }) => (
            <Ionicons
              name={focused ? 'log-out' : 'log-out-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
