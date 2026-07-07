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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ReservaDetalle"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GroupReservasList"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GroupReservaDetalle"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GuestListDetalle"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VIPListNuevo"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VIPListDetalle"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
