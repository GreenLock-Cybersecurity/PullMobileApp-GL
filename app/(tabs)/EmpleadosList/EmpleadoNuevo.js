// app/(tabs)/EmpleadosList/EmpleadoNuevo.js - Glass Morphism Design
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
  ImageBackground,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDataStore } from '@/store/useDataStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';

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
        `Employee created successfully!\n\nGenerated password: ${result.data.generatedPassword}\n\nPlease save this password and share it securely.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to create employee', [
        { text: 'OK' },
      ]);
    }
  };

  const InputField = ({ icon, label, error, children }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <BlurView intensity={50} tint="dark" style={styles.inputWrapper}>
        <View style={styles.inputInner}>
          <View style={styles.inputIconBox}>
            <Ionicons name={icon} size={20} color="#a78bfa" />
          </View>
          {children}
        </View>
      </BlurView>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <CustomHeader showBackButton />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Icon */}
            <View style={styles.headerIcon}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.8)', 'rgba(217, 70, 239, 0.8)']}
                style={styles.headerIconGradient}
              >
                <Ionicons name="person-add" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Create New Member</Text>
              <Text style={styles.headerSubtitle}>
                Fill in the new employee details
              </Text>
            </View>

            {/* Form Card */}
            <BlurView intensity={60} tint="dark" style={styles.formCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.formCardInner}>
                {/* First Name */}
                <InputField
                  icon="person-outline"
                  label="First Name"
                  error={errors.firstName?.message}
                >
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field }) => (
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter first name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={field.value}
                        onChangeText={field.onChange}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </InputField>

                {/* Last Name */}
                <InputField
                  icon="person-outline"
                  label="Last Name"
                  error={errors.lastName?.message}
                >
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field }) => (
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter last name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={field.value}
                        onChangeText={field.onChange}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </InputField>

                {/* Email */}
                <InputField
                  icon="mail-outline"
                  label="Email"
                  error={errors.email?.message}
                >
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <TextInput
                        style={styles.textInput}
                        placeholder="email@example.com"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                </InputField>

                {/* DPI */}
                <InputField
                  icon="card-outline"
                  label="DPI (13 digits)"
                  error={errors.dpi?.message}
                >
                  <Controller
                    control={control}
                    name="dpi"
                    render={({ field }) => (
                      <TextInput
                        style={styles.textInput}
                        placeholder="0000000000000"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="numeric"
                        maxLength={13}
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                </InputField>
              </View>
            </BlurView>

            {/* Info Cards */}
            <BlurView intensity={50} tint="dark" style={styles.infoCard}>
              <View style={styles.infoCardInner}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#a78bfa" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Role</Text>
                  <Text style={styles.infoDescription}>
                    Will be created with "Staff" role by default
                  </Text>
                </View>
              </View>
            </BlurView>

            <BlurView intensity={50} tint="dark" style={styles.infoCard}>
              <View style={styles.infoCardInner}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="key-outline" size={20} color="#a78bfa" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Password</Text>
                  <Text style={styles.infoDescription}>
                    A secure 12-character password will be auto-generated
                  </Text>
                </View>
              </View>
            </BlurView>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting}
                activeOpacity={0.8}
                style={styles.cancelButtonTouch}
              >
                <BlurView intensity={50} tint="dark" style={styles.cancelButton}>
                  <View style={styles.cancelButtonInner}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                activeOpacity={0.8}
                style={styles.submitButtonTouch}
              >
                <BlurView intensity={50} tint="dark" style={styles.submitButton}>
                  <View style={styles.submitButtonInner}>
                    {isSubmitting ? (
                      <ActivityIndicator color="#a78bfa" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#a78bfa" />
                        <Text style={styles.submitButtonText}>Create</Text>
                      </>
                    )}
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },

  // Header
  headerIcon: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },

  // Form Card
  formCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  formCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },

  // Field
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 21, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  inputIconBox: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 16,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
    gap: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },

  // Info Card
  infoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  infoCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 21, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 18,
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButtonTouch: {
    flex: 1,
  },
  cancelButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cancelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(15, 15, 21, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTouch: {
    flex: 1,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 14,
  },
  submitButtonText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
  },
});
