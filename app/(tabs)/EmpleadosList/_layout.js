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
          title: 'Employees',
        }}
      />
      <Stack.Screen
        name="EmpleadoNuevo"
        options={{
          title: 'New Employee',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EmpleadoEditar"
        options={{
          title: 'Edit Employee',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}