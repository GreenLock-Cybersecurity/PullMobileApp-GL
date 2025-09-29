import { Stack } from 'expo-router';

export default function ReservasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
        headerTitle: 'pull',
        headerBackButtonMenuEnabled: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Bookings',
        }}
      />
      <Stack.Screen
        name="ReservaDetalle"
        options={{
          title: 'Booking Details',
        }}
      />
    </Stack>
  );
}
