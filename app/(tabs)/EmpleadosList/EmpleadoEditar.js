// app/(tabs)/EmpleadosList/EmpleadoEditar.js - Glass Morphism Design
import React, { useState, useEffect, useLayoutEffect } from 'react';
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
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
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
  dpi: z.string().optional(),
});

export default function EmpleadoEditar() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const employees = useDataStore((state) => state.employees);
  const updateEmployeeData = useDataStore((state) => state.updateEmployeeData);
  const removeEmployee = useDataStore((state) => state.removeEmployee);
  const fetchEmployees = useDataStore((state) => state.fetchEmployees);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const employee = employees.find((e) => e.id === id);

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      dpi: employee?.dpi || '',
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        dpi: employee.dpi || '',
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const result = await updateEmployeeData(employee.id, data);

    setIsSubmitting(false);

    if (result.success) {
      Alert.alert('Success', 'Employee updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to update employee', [
        { text: 'OK' },
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee?.firstName} ${employee?.lastName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await removeEmployee(employee.id);
            setIsDeleting(false);

            if (result.success) {
              Alert.alert('Success', 'Employee deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    fetchEmployees();
                    router.back();
                  },
                },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  // Check if employee is an admin (cannot be edited)
  const isEmployeeAdmin = employee && ['admin', 'administrador'].includes((employee.role || '').toLowerCase());

  if (!employee) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={15}
      >
        <View style={styles.overlay} />
        <CustomHeader showBackButton />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="person-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Employee not found</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{ marginTop: 16 }}
            >
              <BlurView intensity={50} tint="dark" style={styles.retryBtn}>
                <View style={styles.retryBtnInner}>
                  <Ionicons name="arrow-back" size={18} color="#a78bfa" />
                  <Text style={styles.retryBtnText}>Go Back</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // Prevent editing admin employees
  if (isEmployeeAdmin) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={15}
      >
        <View style={styles.overlay} />
        <CustomHeader showBackButton />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <View style={styles.restrictedIconBox}>
              <Ionicons name="shield-checkmark" size={48} color="#FFD700" />
            </View>
            <Text style={styles.restrictedTitle}>Action Not Allowed</Text>
            <Text style={styles.restrictedText}>
              Admin employees cannot be edited or deleted.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{ marginTop: 24 }}
            >
              <BlurView intensity={50} tint="dark" style={styles.retryBtn}>
                <View style={styles.retryBtnInner}>
                  <Ionicons name="arrow-back" size={18} color="#a78bfa" />
                  <Text style={styles.retryBtnText}>Go Back</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

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
                <Text style={styles.avatarInitials}>
                  {employee.firstName?.charAt(0) || ''}{employee.lastName?.charAt(0) || ''}
                </Text>
              </LinearGradient>
              <Text style={styles.headerTitle}>Edit Employee</Text>
              <Text style={styles.headerSubtitle}>
                {employee.firstName} {employee.lastName}
              </Text>
            </View>

            {/* Role Info Card */}
            <BlurView intensity={50} tint="dark" style={styles.infoCard}>
              <View style={styles.infoCardInner}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#FFD700" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Current Role</Text>
                  <Text style={styles.infoValue}>{employee.role || 'Staff'}</Text>
                </View>
              </View>
            </BlurView>

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
                  label="DPI (Optional)"
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

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting || isDeleting}
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
                disabled={isSubmitting || isDeleting}
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
                        <Text style={styles.submitButtonText}>Update</Text>
                      </>
                    )}
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isSubmitting || isDeleting}
              activeOpacity={0.8}
              style={styles.deleteButtonTouch}
            >
              <BlurView intensity={50} tint="dark" style={styles.deleteButton}>
                <View style={styles.deleteButtonInner}>
                  {isDeleting ? (
                    <ActivityIndicator color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      <Text style={styles.deleteButtonText}>Delete Employee</Text>
                    </>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '300',
    marginTop: 16,
  },
  restrictedIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  restrictedTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  restrictedText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '500',
  },

  // Header
  headerIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarInitials: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
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

  // Info Card
  infoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
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
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
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

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  deleteButtonTouch: {
    marginTop: 8,
  },
  deleteButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
