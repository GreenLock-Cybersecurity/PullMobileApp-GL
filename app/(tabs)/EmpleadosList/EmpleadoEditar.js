// app/(tabs)/EmpleadosList/EmpleadoEditar.js - Clean Modern Design (matching EmpleadoNuevo)
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDataStore } from '@/store/useDataStore';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import { BlurView } from 'expo-blur';

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
  const scrollY = useRef(new Animated.Value(0)).current;

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
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="person-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Employee not found</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{ marginTop: 16 }}
            >
              <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                <View style={styles.backButtonInner}>
                  <Ionicons name="arrow-back" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.backButtonText}>Go Back</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  // Prevent editing admin employees
  if (isEmployeeAdmin) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <View style={styles.restrictedIcon}>
              <Ionicons name="person" size={32} color="rgb(168, 85, 255)" />
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
              <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                <View style={styles.backButtonInner}>
                  <Ionicons name="arrow-back" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.backButtonText}>Go Back</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  return (
    <BackgroundGlow>
      <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />

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
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="create" size={28} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.headerTitle}>Edit Member</Text>
              <Text style={styles.headerSubtitle}>
                {employee.firstName} {employee.lastName}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* First Name */}
              <View style={styles.field}>
                <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Enter first name"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        value={field.value}
                        onChangeText={field.onChange}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>
                {errors.firstName && (
                  <Text style={styles.fieldError}>{errors.firstName.message}</Text>
                )}
              </View>

              {/* Last Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Enter last name"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        value={field.value}
                        onChangeText={field.onChange}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>
                {errors.lastName && (
                  <Text style={styles.fieldError}>{errors.lastName.message}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="email@example.com"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email.message}</Text>
                )}
              </View>

              {/* DPI */}
              <View style={styles.field}>
                <Text style={styles.label}>DPI (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.4)"
                    style={styles.inputIcon}
                  />
                  <Controller
                    control={control}
                    name="dpi"
                    render={({ field }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="0000000000000"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="numeric"
                        maxLength={13}
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                </View>
                {errors.dpi && (
                  <Text style={styles.fieldError}>{errors.dpi.message}</Text>
                )}
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="rgb(168, 85, 255)" />
                <Text style={styles.infoText}>Current role: <Text style={styles.infoHighlight}>{employee.role || 'Staff'}</Text></Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={18} color="rgb(168, 85, 255)" />
                <Text style={styles.infoText}>Role cannot be changed from here</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Cancel Button - Red style */}
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting || isDeleting}
                activeOpacity={0.8}
                style={styles.cancelButton}
              >
                <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                  <View style={styles.cancelButtonInner}>
                    <Ionicons name="close" size={18} color="rgb(239, 68, 68)" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>

              {/* Update Button - Purple style */}
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || isDeleting}
                activeOpacity={0.8}
                style={styles.submitButton}
              >
                <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                  <View style={styles.submitButtonInner}>
                    {isSubmitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="white" />
                        <Text style={styles.submitButtonText}>Update</Text>
                      </>
                    )}
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 24,
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
  restrictedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.7)',
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.7)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '400',
  },

  // Form
  form: {
    gap: 20,
    marginBottom: 28,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  required: {
    color: 'rgb(239, 68, 68)',
    fontWeight: '600',
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
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  fieldError: {
    color: 'rgb(239, 68, 68)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },

  // Info Section
  infoSection: {
    gap: 12,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  infoHighlight: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  buttonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  cancelButtonText: {
    color: 'rgb(239, 68, 68)',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  backButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
});
