import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react'; // ⚠️ AGREGA ESTO

export default function EmpleadosList() {
  const router = useRouter();
  const {
    employees,
    isLoadingEmployees,
    employeesError,
    fetchEmployees, // ⚠️ AGREGA ESTO
    deleteEmployee,
  } = useDataStore();
  const user = useAuthStore((state) => state.user);

  // ⚠️ AGREGA ESTE useEffect PARA CARGAR LOS DATOS
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleEmployeePress = (employee) => {
    if (user?.role !== 'admin') {
      return;
    }

    Alert.alert(
      employee.firstName + ' ' + employee.lastName,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () =>
            router.push(
              `/(tabs)/EmpleadosList/EmpleadoEditar?id=${employee.id}`
            ),
        },
        {
          text: 'Delete',
          onPress: () => confirmDelete(employee),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmDelete = (employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEmployee(employee.id),
        },
      ]
    );
  };

  if (isLoadingEmployees) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="text-foreground mt-4">Loading employees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (employeesError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-foreground text-lg mt-4 text-center">
            {employeesError}
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg px-6 py-3 mt-4"
            onPress={fetchEmployees}
          >
            <Text className="text-primary-foreground font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderEmployee = ({ item }) => (
    <TouchableOpacity
      className="bg-secondary rounded-lg p-4 mb-4 border border-border"
      onPress={() => handleEmployeePress(item)}
      disabled={user?.role !== 'admin'}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-4">
          <Text className="text-primary-foreground font-semibold text-lg">
            {item.firstName?.charAt(0)}
            {item.lastName?.charAt(0)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-lg font-semibold">
            {item.firstName} {item.lastName}
          </Text>
          <Text className="text-muted-foreground text-sm">{item.email}</Text>
        </View>
        {user?.role === 'admin' && (
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-foreground text-2xl font-bold">Employees</Text>
          {user?.role === 'admin' && (
            <TouchableOpacity
              className="bg-primary rounded-lg px-4 py-2"
              onPress={() => router.push('/(tabs)/EmpleadosList/EmpleadoNuevo')}
            >
              <Text className="text-primary-foreground font-medium">
                Add Employee
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-12">
              <Ionicons name="people-outline" size={64} color="#6b7280" />
              <Text className="text-muted-foreground text-lg mt-4">
                No employees found
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
