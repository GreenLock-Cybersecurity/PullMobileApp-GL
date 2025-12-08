// app/(tabs)/EmpleadosList/index.js - Employees List with Expandable Cards
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState, useRef, useCallback } from 'react';
import CustomHeader from '@/components/CustomHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Role configuration - handles both "admin"/"administrador" variants
const ROLE_CONFIG = {
  admin: {
    label: 'Administrators',
    icon: 'shield-checkmark',
    colors: ['rgba(255, 215, 0, 0.8)', 'rgba(255, 165, 0, 0.8)'],
    borderColor: 'rgba(255, 215, 0, 0.4)',
    textColor: '#FFD700',
    order: 1,
  },
  administrador: {
    label: 'Administrators',
    icon: 'shield-checkmark',
    colors: ['rgba(255, 215, 0, 0.8)', 'rgba(255, 165, 0, 0.8)'],
    borderColor: 'rgba(255, 215, 0, 0.4)',
    textColor: '#FFD700',
    order: 1,
  },
  staff: {
    label: 'Staff',
    icon: 'people',
    colors: ['rgba(139, 92, 246, 0.8)', 'rgba(217, 70, 239, 0.8)'],
    borderColor: 'rgba(139, 92, 246, 0.4)',
    textColor: '#a78bfa',
    order: 2,
  },
};

const animConfig = {
  duration: 250,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

// Role Section Component - Simple expandable without tree
function RoleSection({ role, employees, isExpanded, onToggle, onEmployeePress, isAdmin }) {
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const config = ROLE_CONFIG[role.toLowerCase()] || ROLE_CONFIG.staff;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      friction: 10,
    }).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleToggle = () => {
    LayoutAnimation.configureNext(animConfig);
    onToggle();
  };

  return (
    <View style={styles.roleSectionContainer}>
      {/* Role Header */}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
        <BlurView intensity={60} tint="dark" style={styles.roleHeader}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.roleHeaderInner}>
            <View style={[styles.roleAccent, { backgroundColor: config.textColor }]} />

            <LinearGradient colors={config.colors} style={styles.roleIconBg}>
              <Ionicons name={config.icon} size={22} color="white" />
            </LinearGradient>

            <View style={styles.roleInfo}>
              <Text style={[styles.roleLabel, { color: config.textColor }]}>{config.label}</Text>
              <Text style={styles.roleCount}>{employees.length} {employees.length === 1 ? 'member' : 'members'}</Text>
            </View>

            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="chevron-forward" size={20} color={config.textColor} />
            </Animated.View>
          </View>
        </BlurView>
      </TouchableOpacity>

      {/* Employees - Simple cards without tree */}
      {isExpanded && employees.length > 0 && (
        <View style={styles.employeesContainer}>
          {employees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              onPress={() => onEmployeePress(employee)}
              disabled={!isAdmin}
              activeOpacity={0.8}
              style={styles.employeeCardTouch}
            >
              <BlurView intensity={50} tint="dark" style={styles.employeeCard}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.03)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.employeeCardInner}>
                  <LinearGradient colors={config.colors} style={styles.employeeAvatar}>
                    <Text style={styles.avatarText}>
                      {employee.firstName?.charAt(0) || ''}{employee.lastName?.charAt(0) || ''}
                    </Text>
                  </LinearGradient>

                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {employee.firstName} {employee.lastName}
                    </Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.detailText} numberOfLines={1}>{employee.email || 'No email'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.detailText}>{formatDate(employee.createdAt)}</Text>
                    </View>
                  </View>

                  {isAdmin && <Ionicons name="ellipsis-vertical" size={18} color="rgba(167, 139, 250, 0.6)" />}
                </View>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EmpleadosList() {
  const router = useRouter();
  const { employees, isLoadingEmployees, employeesError, fetchEmployees } = useDataStore();
  const user = useAuthStore((state) => state.user);
  const [expandedRoles, setExpandedRoles] = useState({ admin: true, administrador: true, staff: true });

  // Refetch employees when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [fetchEmployees])
  );

  const toggleRole = (role) => setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }));

  const handleEmployeePress = (employee) => {
    if (!['admin', 'administrador'].includes(user?.role?.toLowerCase())) return;

    // Don't allow editing/deleting admins
    const employeeRole = (employee.role || '').toLowerCase();
    if (['admin', 'administrador'].includes(employeeRole)) {
      Alert.alert(
        'Action Not Allowed',
        'Admin employees cannot be edited or deleted.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      `${employee.firstName} ${employee.lastName}`,
      'Select an action',
      [
        { text: 'Edit', onPress: () => router.push(`/(tabs)/EmpleadosList/EmpleadoEditar?id=${employee.id}`) },
        { text: 'Delete', onPress: () => confirmDelete(employee), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmDelete = (employee) => {
    Alert.alert('Delete Employee', `Delete ${employee.firstName} ${employee.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { removeEmployee } = useDataStore.getState();
          await removeEmployee(employee.id);
          fetchEmployees();
        },
      },
    ]);
  };

  const groupedEmployees = employees.reduce((acc, emp) => {
    const role = (emp.role || 'staff').toLowerCase();
    if (!acc[role]) acc[role] = [];
    acc[role].push(emp);
    return acc;
  }, {});

  const sortedRoles = Object.keys(groupedEmployees).sort((a, b) => (ROLE_CONFIG[a]?.order || 99) - (ROLE_CONFIG[b]?.order || 99));
  const totalEmployees = employees.length;
  const isAdmin = ['admin', 'administrador'].includes(user?.role?.toLowerCase());

  if (isLoadingEmployees) {
    return (
      <ImageBackground source={require('../../../assets/fondo.webp')} style={styles.background} blurRadius={15}>
        <View style={styles.overlay} />
        <CustomHeader title="Team" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
            <Text style={styles.loadingText}>Loading team...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (employeesError) {
    return (
      <ImageBackground source={require('../../../assets/fondo.webp')} style={styles.background} blurRadius={15}>
        <View style={styles.overlay} />
        <CustomHeader title="Team" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={56} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{employeesError}</Text>
            <TouchableOpacity onPress={fetchEmployees} activeOpacity={0.8} style={{ marginTop: 16 }}>
              <BlurView intensity={50} tint="dark" style={styles.retryBtn}>
                <View style={styles.retryBtnInner}>
                  <Ionicons name="refresh" size={18} color="#a78bfa" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../../assets/fondo.webp')} style={styles.background} blurRadius={15}>
      <View style={styles.overlay} />
      <CustomHeader title="Team" />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Stats Card */}
            <BlurView intensity={60} tint="dark" style={styles.statsCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statsCardInner}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrapper}>
                      <BlurView intensity={80} tint="dark" style={styles.statIconBlur}>
                        <LinearGradient
                          colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                          style={styles.statIconGradient}
                        >
                          <Ionicons name="people" size={22} color="#a78bfa" />
                        </LinearGradient>
                      </BlurView>
                    </View>
                    <Text style={styles.statValue}>{totalEmployees}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrapper}>
                      <BlurView intensity={80} tint="dark" style={styles.statIconBlur}>
                        <LinearGradient
                          colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
                          style={styles.statIconGradient}
                        >
                          <Ionicons name="shield-checkmark" size={22} color="#FFD700" />
                        </LinearGradient>
                      </BlurView>
                    </View>
                    <Text style={styles.statValue}>{(groupedEmployees.admin?.length || 0) + (groupedEmployees.administrador?.length || 0)}</Text>
                    <Text style={styles.statLabel}>Admins</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrapper}>
                      <BlurView intensity={80} tint="dark" style={styles.statIconBlur}>
                        <LinearGradient
                          colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                          style={styles.statIconGradient}
                        >
                          <Ionicons name="person" size={22} color="#a78bfa" />
                        </LinearGradient>
                      </BlurView>
                    </View>
                    <Text style={styles.statValue}>{groupedEmployees.staff?.length || 0}</Text>
                    <Text style={styles.statLabel}>Staff</Text>
                  </View>
                </View>
              </View>
            </BlurView>

            {/* Add Button - Glass Morphism */}
            {isAdmin && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/EmpleadosList/EmpleadoNuevo')} activeOpacity={0.8}>
                <BlurView intensity={60} tint="dark" style={styles.addBtn}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.15)', 'rgba(217, 70, 239, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.addBtnInner}>
                    <Ionicons name="person-add" size={20} color="#a78bfa" />
                    <Text style={styles.addBtnText}>Add Member</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            {/* Sections */}
            <Text style={styles.sectionTitle}>Team Members</Text>

            {sortedRoles.length === 0 ? (
              <BlurView intensity={50} tint="dark" style={styles.emptyCard}>
                <View style={styles.emptyCardInner}>
                  <Ionicons name="people-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.emptyText}>No members</Text>
                  {isAdmin && <Text style={styles.emptySubtext}>Tap "Add Member" to get started</Text>}
                </View>
              </BlurView>
            ) : (
              sortedRoles.map((role) => (
                <RoleSection
                  key={role}
                  role={role}
                  employees={groupedEmployees[role]}
                  isExpanded={expandedRoles[role]}
                  onToggle={() => toggleRole(role)}
                  onEmployeePress={handleEmployeePress}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0a0a0f' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.75)' },
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 15, marginTop: 16 },
  errorText: { color: 'rgba(239, 68, 68, 0.9)', fontSize: 16, marginTop: 16, textAlign: 'center' },

  retryBtn: { borderRadius: 12, overflow: 'hidden' },
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
  retryBtnText: { color: '#a78bfa', fontSize: 15, fontWeight: '500' },

  // Stats Card
  statsCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  statsCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIconWrapper: { marginBottom: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  statIconBlur: { borderRadius: 14, overflow: 'hidden' },
  statIconGradient: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: 'white', fontSize: 22, fontWeight: '700' },
  statLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },

  // Add Button
  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 14,
  },
  addBtnText: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },

  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 16 },

  // Role Section
  roleSectionContainer: { marginBottom: 16 },
  roleHeader: { borderRadius: 16, overflow: 'hidden' },
  roleHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    paddingLeft: 16,
  },
  roleAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  roleIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  roleCount: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 },

  // Employees Container (no tree)
  employeesContainer: { marginTop: 10, gap: 10 },

  // Employee Card
  employeeCardTouch: {},
  employeeCard: { borderRadius: 14, overflow: 'hidden' },
  employeeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
  },
  employeeAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: 'white', fontSize: 15, fontWeight: '700' },
  employeeInfo: { flex: 1 },
  employeeName: { color: 'white', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  detailText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, flex: 1 },

  // Empty State
  emptyCard: { borderRadius: 16, overflow: 'hidden' },
  emptyCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 15, marginTop: 12 },
  emptySubtext: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, marginTop: 6 },
});
