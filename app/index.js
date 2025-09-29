// app/index.js - Remover hooks problemáticos
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const router = useRouter();
  const segments = useSegments();

  const { login, isLoading, error } = useAuthStore(
    useShallow((state) => ({
      login: state.login,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailController = useController({
    control,
    name: 'email',
  });

  const passwordController = useController({
    control,
    name: 'password',
  });

  const onSubmit = async (data) => {
    try {
      const result = await login(data.email, data.password);

      if (result.success) {
        try {
          router.replace('/(tabs)/EventosList');
        } catch (navError) {
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', result.error || error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-background justify-center px-6">
      <View className="mb-8">
        <Text className="text-foreground text-3xl font-bold mb-2">
          Welcome Back
        </Text>
        <Text className="text-muted-foreground text-base">
          Sign in to continue
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-foreground text-sm font-medium mb-2">
            Email
          </Text>
          <TextInput
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
            placeholder="Enter your email"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={emailController.field.value}
            onChangeText={emailController.field.onChange}
            editable={!isLoading}
          />
          {errors.email && (
            <Text className="text-destructive text-sm mt-1">
              {errors.email.message}
            </Text>
          )}
        </View>

        <View>
          <Text className="text-foreground text-sm font-medium mb-2">
            Password
          </Text>
          <TextInput
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
            placeholder="Enter your password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={passwordController.field.value}
            onChangeText={passwordController.field.onChange}
            editable={!isLoading}
          />
          {errors.password && (
            <Text className="text-destructive text-sm mt-1">
              {errors.password.message}
            </Text>
          )}
        </View>

        {error && (
          <View className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <Text className="text-destructive text-sm">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          className={`bg-primary rounded-lg py-4 mt-6 ${
            isLoading ? 'opacity-50' : ''
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text className="text-primary-foreground text-center font-semibold text-base">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-8 p-4 bg-secondary rounded-lg">
        <Text className="text-muted-foreground text-sm mb-2">
          Enter your organization credentials
        </Text>
      </View>
    </View>
  );
}
