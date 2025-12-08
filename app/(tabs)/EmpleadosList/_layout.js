import { Stack } from 'expo-router';

export default function EmpleadosLayout() {
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
        name="EmpleadoNuevo"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EmpleadoEditar"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}