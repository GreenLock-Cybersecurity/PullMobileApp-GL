import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDataStore } from '@/store/useDataStore';

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  dpi: z.string().length(13, 'DPI must be exactly 13 digits'),
});

export default function EmpleadoNuevo() {
  const router = useRouter();
  const addEmployee = useDataStore((state) => state.addEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dpi: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const result = await addEmployee(data);

    setIsSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Employee Created',
        `Employee created successfully!\n\nGenerated password: ${result.data.generatedPassword}\n\nPlease save this password and share it with the employee securely.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to create employee', [
        { text: 'OK' },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="space-y-4">
          <View>
            <Text className="text-foreground text-sm font-medium mb-2">
              First Name
            </Text>
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
              <Text className="text-destructive text-sm mt-1">
                {errors.firstName.message}
              </Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">
              Last Name
            </Text>
            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter last name"
                  placeholderTextColor="#6b7280"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.lastName && (
              <Text className="text-destructive text-sm mt-1">
                {errors.lastName.message}
              </Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">
              Email
            </Text>
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
              <Text className="text-destructive text-sm mt-1">
                {errors.email.message}
              </Text>
            )}
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">
              DPI (13 digits)
            </Text>
            <Controller
              control={control}
              name="dpi"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter 13-digit DPI"
                  placeholderTextColor="#6b7280"
                  keyboardType="numeric"
                  maxLength={13}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.dpi && (
              <Text className="text-destructive text-sm mt-1">
                {errors.dpi.message}
              </Text>
            )}
          </View>

          <View className="bg-secondary rounded-lg p-4 mt-4 border border-border">
            <Text className="text-foreground text-sm font-medium mb-2">
              Role
            </Text>
            <Text className="text-muted-foreground text-sm">
              This employee will be created with "Staff" role by default.
            </Text>
          </View>

          <View className="bg-secondary rounded-lg p-4 border border-border">
            <Text className="text-foreground text-sm font-medium mb-2">
              Password
            </Text>
            <Text className="text-muted-foreground text-sm">
              A secure 12-character password will be automatically generated for
              this employee.
            </Text>
          </View>

          <View className="flex-row space-x-4 mt-6">
            <TouchableOpacity
              className="flex-1 bg-secondary border border-border rounded-lg py-3"
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text className="text-foreground text-center font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-lg py-3"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-primary-foreground text-center font-medium">
                  Create Employee
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
