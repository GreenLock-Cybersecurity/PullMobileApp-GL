// app/(tabs)/EmpleadosList/index.js - Clean Modern Team View
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
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
import BackgroundGlow from '@/components/BackgroundGlow';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Role configuration
const ROLE_CONFIG = {
  admin: {
    label: 'Administrators',
    icon: 'key',
    color: 'rgb(59, 130, 246)',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    order: 1,
  },
  administrador: {
    label: 'Administrators',
    icon: 'key',
    color: 'rgb(59, 130, 246)',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    order: 1,
  },
  staff: {
    label: 'Staff',
    icon: 'people',
    color: 'rgb(168, 85, 255)',
    bgColor: 'rgba(168, 85, 255, 0.12)',
    order: 2,
  },
};

const animConfig = {
  duration: 250,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

// Role Section Component
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
      {/* Role Header - Clean minimal style */}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7} style={styles.roleHeader}>
        <View style={[styles.roleIconCircle, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        <View style={styles.roleInfo}>
          <Text style={[styles.roleLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.roleCount}>{employees.length} {employees.length === 1 ? 'member' : 'members'}</Text>
        </View>

        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
        </Animated.View>
      </TouchableOpacity>

      {/* Employee List */}
      {isExpanded && employees.length > 0 && (
        <View style={styles.employeesContainer}>
          {employees.map((employee, index) => (
            <TouchableOpacity
              key={employee.id}
              onPress={() => onEmployeePress(employee)}
              disabled={!isAdmin}
              activeOpacity={0.7}
            >
              <View style={[
                styles.employeeRow,
                index === employees.length - 1 && styles.employeeRowLast
              ]}>
                <View style={[styles.employeeAvatar, { backgroundColor: config.bgColor }]}>
                  <Text style={[styles.avatarText, { color: config.color }]}>
                    {employee.firstName?.charAt(0) || ''}{employee.lastName?.charAt(0) || ''}
                  </Text>
                </View>

                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName} numberOfLines={1}>
                    {employee.firstName} {employee.lastName}
                  </Text>
                  <Text style={styles.employeeEmail} numberOfLines={1}>
                    {employee.email || 'No email'}
                  </Text>
                </View>

                {isAdmin && (
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                )}
              </View>
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
  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [fetchEmployees])
  );

  const toggleRole = (role) => setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }));

  const handleEmployeePress = (employee) => {
    if (!['admin', 'administrador'].includes(user?.role?.toLowerCase())) return;

    const employeeRole = (employee.role || '').toLowerCase();
    if (['admin', 'administrador'].includes(employeeRole)) {
      Alert.alert('Action Not Allowed', 'Admin employees cannot be edited or deleted.', [{ text: 'OK' }]);
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
  const adminCount = (groupedEmployees.admin?.length || 0) + (groupedEmployees.administrador?.length || 0);
  const staffCount = groupedEmployees.staff?.length || 0;
  const isAdmin = ['admin', 'administrador'].includes(user?.role?.toLowerCase());

  if (isLoadingEmployees) {
    return (
      <BackgroundGlow>
        <CustomHeader title="Team" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
            <Text style={styles.loadingText}>Loading team...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (employeesError) {
    return (
      <BackgroundGlow>
        <CustomHeader title="Team" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{employeesError}</Text>
            <TouchableOpacity onPress={fetchEmployees} activeOpacity={0.7} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  return (
    <BackgroundGlow>
      <CustomHeader title="Team" scrollY={scrollY} enableBlurOnScroll />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
          >
            {/* Stats Row - Icons centered on top */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconCircle}>
                  <Ionicons name="people" size={22} color="rgb(168, 85, 255)" />
                </View>
                <Text style={styles.statValue}>{totalEmployees}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, styles.statIconCircleBlue]}>
                  <Ionicons name="key" size={20} color="rgb(59, 130, 246)" />
                </View>
                <Text style={styles.statValue}>{adminCount}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIconCircle}>
                  <Ionicons name="person" size={22} color="rgb(168, 85, 255)" />
                </View>
                <Text style={styles.statValue}>{staffCount}</Text>
                <Text style={styles.statLabel}>Staff</Text>
              </View>
            </View>

            {/* Add Button */}
            {isAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/EmpleadosList/EmpleadoNuevo')}
                activeOpacity={0.8}
                style={styles.addBtn}
              >
                <BlurView intensity={60} tint="dark" style={styles.addBtnBlur}>
                  <View style={styles.addBtnInner}>
                    <Ionicons name="person-add" size={18} color="white" />
                    <Text style={styles.addBtnText}>Add Member</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            {/* Team Members */}
            <Text style={styles.sectionTitle}>Team Members</Text>

            {sortedRoles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={40} color="rgba(255, 255, 255, 0.25)" />
                <Text style={styles.emptyText}>No team members yet</Text>
                {isAdmin && <Text style={styles.emptySubtext}>Add your first member above</Text>}
              </View>
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
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    marginTop: 16,
    fontWeight: '400',
  },
  errorText: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  retryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
  },
  retryBtnText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '500',
  },

  // Stats Row - Icons on top
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconCircleBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Add Button
  addBtn: {
    marginBottom: 28,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 12,
  },
  addBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },

  // Role Section
  roleSectionContainer: {
    marginBottom: 20,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  roleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  roleCount: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
  },

  // Employees
  employeesContainer: {
    marginTop: 4,
    marginLeft: 18,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.06)',
    paddingLeft: 18,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  employeeRowLast: {
    borderBottomWidth: 0,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeEmail: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '400',
    marginTop: 12,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
  },
});
