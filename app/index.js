import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import BackgroundGlow from '@/components/BackgroundGlow';

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1467.12 901.4"><path fill="#fdfefe" d="M557.99.18c5.32.06 10.68-.1 16 0l17.51 1.99h13.49c68.45 6.87 171.59 19.13 195.49 96.02 1.46 4.68 3.25 11 3.51 14.99.61 9.48.04 21.52-1 31-.08.72-2.05 2.39-.12 4.56-3.83 9.34-7.56 24.42-11.88 36.44l-12 25c-54.06 89.29-150.83 138.24-254 145l-69 3h-43l-34-2c-2.47-1.37 1.26-4.54 2-6 5.16-10.27 10.04-20.63 15-31 .13-.27-.13-.73 0-1 2.21.92 4.89-5.24 3-6 5.2-10.72 12.78-29.58 18.81-38.69.93-1.41 1.72-2.86 3.2-3.8 63.6-4.81 129.87-17.58 182.71-55.29 27-19.26 60.88-53.57 57.26-89.72-4.67-46.67-87.41-48.93-121.99-50.51.56-3.03-1.53-1.92-3.45-2-27.44-1.08-54.69.78-82 2.04-2.91.13-16.41-.6-17.34.22-.46.41-.1 1.68-.2 1.74-.34.22-1.94-.62-3.07.63-1.37 1.52-1.3 5.16-2.02 6.58-52.09 103.55-103.32 204.95-153.63 307.53-.68 1.38-6.04 4.8-3.28 7.26.36 1.11 1.44.96 2.4 1.05 23.44 2.19 52.89-.34 77.14-.09 14.99.15 30.31.95 45.46 1.04 26.32.16 52.68-.04 79 0h9c1.04 1.66 3.8 1 5.49 1.02 26.92.33 53.68.33 80.51.98 2.32.06 4.67-.05 7 0 .25 2-1.69 3.31-2.98 4.51C497.1 480.56 415.47 551.28 337 626.17c-5.1 3.58-10.06 8.05-14 13-63.13 60.53-128.83 122.71-189 186-4 2.64-6.75 6.61-10 10-.33.34-.67.66-1 1-5.91 3.64-10.09 9.22-15 14-16.16 15.75-31.65 29.68-51.33 41.17-2.9 1.69-19.84 11.66-21.67 9.82l.21-3.27c61.14-157.03 122.8-314.12 188.83-468.99.56-1.3 2.33-.11 1.95-1.72l-220 101-5.99 2 1.99-7c86.7-164.99 168.33-332.72 256.59-496.91 4.53-9.8 15.41-7.91 23.86-9.14 16.85-2.44 34.35-4.94 51.55-6.95h9.49l22.51-3c10.68-.89 21.37-1.23 32-2l1-1c.33-.02.67.02 1 0l29-2h1c6.49-.18 13.04.11 19.54.04l12.46-1.04c31.64-1.33 64.04-1.33 96-1M1449.99 99.18c5.85.13 15-1.9 16.79 5.71.78 3.3.06 5.74-.75 8.84-2.31 8.93-8.42 19.09-11.94 27.26-35.53 82.5-71.87 164.72-106.69 246.08-15.8 36.91-32.7 75.39-47.7 111.36-4.65 11.16-9.72 22.35-13.7 33.76-2.24 6.41-6.29 15.37-4.8 22.35.33 1.55 1.44 1.95 1.8 2.65 1.46 2.85.98 2.93 4 5 7.19 4.93 14.27 3.12 22 1 8.46-2.32 19.31-6.61 27.69-9.81 5.02-1.92 9.95-6.68 15.86-5.31 3 2.55-.17 14.23-1.04 18.13-9.38 42.1-49.1 84.77-93.51 91.99-11.32-.12-22.76.5-34-1-24.26-3.23-44.11-23.26-49.56-46.94-.82-3.58-.4-7.48-1.45-11.05-1.89.65-2.86 2.57-3.99 4-4.79 3.54-8.61 8.17-12 13-.33.34-.67.67-1 1l-2 2c-.34.33-.66.67-1 1-2.1.4-2.76 1.8-4 3-17.48 16.91-41.94 30.72-66 35-2.82.18-5.72-.27-8.54-.04-1.28.11-2.63 1.04-2.96 1.04h-15c-1.26 0-10.39-1.6-12.5-2-20.91-3.92-36.48-18.41-44.86-37.64l-5.63-18.35c-1.3 1.07-1.72 2.92-3.01 3.99-28.37 23.43-65.05 55.31-103.5 58-4.84.34-11.99.98-16.5 1-3.3.01-7.68-1.93-11.5-1-31.64-5.07-57.39-24.93-58.01-58.99-1.88-.56-1.66.78-1.99.99-2.51 1.61-3.5 3.6-5 6-.33.34-.67.67-1 1-4.28 2.35-7.49 6.73-11 10-21.14 19.67-47.25 34.84-76 40l-39 1c-23.59-2.61-45.98-12.99-58.82-33.68-22.67-36.53 4.72-89.91 19.35-125.29 20-48.35 41.42-98.2 63.29-145.71 2.91-6.32 10.6-25.12 15.22-28.78 1.59-1.26 4.91-2.54 6.92-3.08 10.62-2.87 28.62-3.61 40.04-4.46h30c6.6 2.68 14.58-.96 15.94 8.57.87 6.08-4.12 17.34-6.46 23.42-16.05 41.66-35.17 82.43-51.78 123.26-6.9 16.95-15.3 35.89-21.01 51.99-6.25 17.65-14.7 42.56 10.26 49.31 27.08 7.32 61.16-15.12 73.22-38.87 32.32-63.68 56.39-135.55 87.65-200.35 3.65-7.57 5.41-14.11 14.52-16.48 17.74-4.62 48.18-6.58 67.17-7.83 7.32-.48 36.13-2.83 40.22 2.26 5.31 6.61-4.58 24.76-7.27 31.75-10.59 27.49-24.09 58.95-35.1 85.31-17.81 42.62-37.65 86.28-53.27 130.34-1.49 11.73 11.3 17.72 21.36 16.28 19.86-2.83 53.25-19.11 62.41-37.59l180.66-426.34c3.47-4.74 18.17-7.82 24.08-8.92 19.6-3.66 52.01-8.52 71.89-7.09 7.4.53 13.67 1.2 15.27 9.72.58 3.1.14 9.57-.85 12.49-4.09 12.16-12.98 28.89-18.4 41.8-49.44 117.9-102.21 234.05-150.8 354.32-3.17 7.83-9.26 19.14-8.86 28.21.02.51-1.69.32-1.83 1.14-.76 4.45-1.35 9.21.07 13.51.22.67 1.31.75 1.78 1.62 1.81 3.37-.23 4.38 5.56 6.24 10.26 3.29 28.67-5.95 37.86-11.25 3.72-2.15 11.62-6.82 13.91-10.09 60.26-144.27 123.29-287.42 186.62-430.38 1.8-3.9 6.6-7.94 10.61-9.39 5.02-1.82 17.63-3.91 23.56-4.94 18.92-3.31 38.82-5.42 58-5Z"/></svg>`;

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const { height } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
    <BackgroundGlow>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <SvgXml xml={logoSvg} width={100} height={40} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.subtitle}>
                Access your staff account
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={emailController.field.value}
                    onChangeText={emailController.field.onChange}
                    editable={!isLoading}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email.message}</Text>
                )}
              </View>

              {/* Password Field */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithButton]}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    value={passwordController.field.value}
                    onChangeText={passwordController.field.onChange}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.togglePassword}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="rgba(255, 255, 255, 0.5)"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.fieldError}>{errors.password.message}</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#a855ff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#a855ff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    minHeight: height,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '400',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 48,
    paddingLeft: 44,
    paddingRight: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  inputWithButton: {
    paddingRight: 48,
  },
  togglePassword: {
    position: 'absolute',
    right: 14,
    padding: 4,
    zIndex: 1,
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginTop: 8,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#a855ff',
    fontSize: 15,
    fontWeight: '600',
  },
});
