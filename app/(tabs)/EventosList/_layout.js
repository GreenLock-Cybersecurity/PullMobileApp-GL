import { Stack } from 'expo-router';

export default function EventosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
        headerTitle: 'pull',
        headerBackButtonMenuEnabled: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Events',
        }}
      />
      <Stack.Screen
        name="EventoDetalle"
        options={{
          title: 'Event Details',
        }}
      />
      <Stack.Screen
        name="EventoNuevo"
        options={{
          title: 'New Event',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}