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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EventoDetalle"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EventoNuevo"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EventoEditar"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TicketsGestion"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}