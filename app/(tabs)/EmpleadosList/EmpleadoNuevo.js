import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDataStore } from '@/store/useDataStore';

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName1: z.string().min(1, 'First last name is required'),
  lastName2: z.string().min(1, 'Second last name is required'),
  email: z.string().email('Invalid email address'),
});

export default function EmpleadoNuevo() {
  const router = useRouter();
  const addEmployee = useDataStore((state) => state.addEmployee);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName1: '',
      lastName2: '',
      email: '',
    },
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const onSubmit = (data) => {
    const newEmployee = {
      ...data,
      password: generatePassword(),
    };

    addEmployee(newEmployee);
    
    Alert.alert(
      'Employee Created',
      `Employee created successfully!\n\nGenerated password: ${newEmployee.password}\n\nPlease save this password securely.`,
      [
        { text: 'OK', onPress: () => router.back() }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="space-y-4">
          <View>
            <Text className="text-foreground text-sm font-medium mb-2">First Name</Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter first name"
                  placeholderTextColor="#6b7280"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.firstName && (
              <Text className="text-destructive text-sm mt-1">{errors.firstName.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">First Last Name</Text>
            <Controller
              control={control}
              name="lastName1"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter first last name"
                  placeholderTextColor="#6b7280"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.lastName1 && (
              <Text className="text-destructive text-sm mt-1">{errors.lastName1.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">Second Last Name</Text>
            <Controller
              control={control}
              name="lastName2"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter second last name"
                  placeholderTextColor="#6b7280"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.lastName2 && (
              <Text className="text-destructive text-sm mt-1">{errors.lastName2.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter email address"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.email && (
              <Text className="text-destructive text-sm mt-1">{errors.email.message}</Text>
            )}
          </View>

          <View className="bg-secondary rounded-lg p-4 mt-4">
            <Text className="text-foreground text-sm font-medium mb-2">Password</Text>
            <Text className="text-muted-foreground text-sm">
              A secure password will be automatically generated for this employee.
            </Text>
          </View>

          <View className="flex-row space-x-4 mt-6">
            <TouchableOpacity
              className="flex-1 bg-secondary border border-border rounded-lg py-3"
              onPress={() => router.back()}
            >
              <Text className="text-foreground text-center font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-lg py-3"
              onPress={handleSubmit(onSubmit)}
            >
              <Text className="text-primary-foreground text-center font-medium">Create Employee</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}