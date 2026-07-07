// app/(tabs)/Logout/index.js - Clean Modern Design
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import { BlurView } from 'expo-blur';

export default function Profile() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  // Get display name
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.full_name || user?.name || 'Staff Member';

  // Get role display text
  const getRoleDisplay = () => {
    if (!user?.role) return 'Staff';
    const role = user.role.toLowerCase();
    if (role === 'admin') return 'Administrator';
    if (role === 'manager') return 'Manager';
    if (role === 'staff') return 'Staff';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  };

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Colors based on role - Admin: Blue, Staff: Purple
  const accentColor = isAdmin ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 255)';
  const accentColorRgba = (opacity) => isAdmin
    ? `rgba(59, 130, 246, ${opacity})`
    : `rgba(168, 85, 255, ${opacity})`;

  return (
    <BackgroundGlow>
      <CustomHeader title="Profile" scrollY={scrollY} enableBlurOnScroll />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={[
              styles.avatarContainer,
              {
                backgroundColor: accentColorRgba(0.1),
                borderColor: accentColorRgba(0.7),
              }
            ]}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person'}
                size={36}
                color={accentColor}
              />
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <View style={[
              styles.roleBadge,
              {
                backgroundColor: accentColorRgba(0.15),
                borderColor: accentColorRgba(0.4),
              }
            ]}>
              <Text style={[styles.roleText, { color: accentColor }]}>
                {getRoleDisplay()}
              </Text>
            </View>
          </View>

          {/* All Info in One Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color={accentColor} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: accentColorRgba(0.1) }]} />

            {/* Role */}
            <View style={styles.infoItem}>
              <Ionicons name={isAdmin ? 'shield-outline' : 'person-outline'} size={20} color={accentColor} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={[styles.infoValue, { color: accentColor }]}>{getRoleDisplay()}</Text>
              </View>
            </View>

            {/* Venue */}
            {user?.venue_name && (
              <>
                <View style={[styles.divider, { backgroundColor: accentColorRgba(0.1) }]} />
                <View style={styles.infoItem}>
                  <Ionicons name="business-outline" size={20} color={accentColor} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Venue</Text>
                    <Text style={styles.infoValue}>{user.venue_name}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Organization */}
            {user?.organization_name && (
              <>
                <View style={[styles.divider, { backgroundColor: accentColorRgba(0.1) }]} />
                <View style={styles.infoItem}>
                  <Ionicons name="layers-outline" size={20} color={accentColor} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization</Text>
                    <Text style={styles.infoValue}>{user.organization_name}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Employee ID */}
            {user?.id && (
              <>
                <View style={[styles.divider, { backgroundColor: accentColorRgba(0.1) }]} />
                <View style={styles.infoItem}>
                  <Ionicons name="finger-print-outline" size={20} color="rgba(255, 255, 255, 0.4)" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Employee ID</Text>
                    <Text style={styles.infoValueMono}>{user.id.slice(0, 16)}...</Text>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: accentColorRgba(0.1) }]} />

            {/* Status */}
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: 'rgb(52, 211, 153)' }]}>Active</Text>
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={styles.signOutButton}
          >
            <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
              <View style={styles.signOutButtonInner}>
                <Ionicons name="log-out-outline" size={20} color="rgb(239, 68, 68)" />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 60,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  displayName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Card
  card: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  // Info Items
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  infoValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  infoValueMono: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },

  // Sign Out Button
  signOutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  signOutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  signOutButtonText: {
    color: 'rgb(239, 68, 68)',
    fontSize: 16,
    fontWeight: '600',
  },
});
