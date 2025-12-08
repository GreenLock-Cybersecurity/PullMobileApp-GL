import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ImageBackground,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import CustomHeader from '@/components/CustomHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function Profile() {
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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

  // Get initials for avatar
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return 'U';
  };

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

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <CustomHeader title="Profile" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileSection}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={isAdmin
                  ? ['rgba(255, 215, 0, 0.7)', 'rgba(255, 165, 0, 0.7)']
                  : ['rgba(139, 92, 246, 0.7)', 'rgba(217, 70, 239, 0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
                </View>
              )}
            </View>

            {/* Name and Role */}
            <Text style={styles.displayName}>{displayName}</Text>

            <View style={styles.roleBadge}>
              <LinearGradient
                colors={isAdmin
                  ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']
                  : ['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.roleBadgeGradient}
              >
                <Ionicons
                  name={isAdmin ? 'shield-checkmark' : 'person-circle'}
                  size={14}
                  color={isAdmin ? '#FFD700' : '#a78bfa'}
                />
                <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
                  {getRoleDisplay()}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Info Card */}
          <BlurView intensity={60} tint="dark" style={styles.infoCard}>
            <View style={styles.infoCardInner}>
              <Text style={styles.sectionTitle}>Account Information</Text>

              {/* Email */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="mail-outline" size={20} color="#a78bfa" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
                </View>
              </View>

              {/* Venue */}
              {user?.venue_name && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="business-outline" size={20} color="#a78bfa" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Venue</Text>
                    <Text style={styles.infoValue}>{user.venue_name}</Text>
                  </View>
                </View>
              )}

              {/* Organization */}
              {user?.organization_name && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="layers-outline" size={20} color="#a78bfa" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Organization</Text>
                    <Text style={styles.infoValue}>{user.organization_name}</Text>
                  </View>
                </View>
              )}

              {/* Employee ID */}
              {user?.id && (
                <View style={[styles.infoRow, styles.infoRowLast]}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="id-card-outline" size={20} color="#a78bfa" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Employee ID</Text>
                    <Text style={styles.infoValueSmall}>{user.id.slice(0, 8)}...</Text>
                  </View>
                </View>
              )}
            </View>
          </BlurView>

          {/* Logout Button - Glass Morphism */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={styles.logoutButtonContainer}
          >
            <BlurView intensity={40} tint="dark" style={styles.logoutButton}>
              <View style={styles.logoutButtonInner}>
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            You will be redirected to the login screen
          </Text>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  avatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '600',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  displayName: {
    color: 'white',
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  roleBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    borderRadius: 20,
  },
  roleText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  roleTextAdmin: {
    color: '#FFD700',
  },

  // Info Card
  infoCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  infoCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  infoValueSmall: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'monospace',
  },

  // Logout Button - Glass Morphism
  logoutButtonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 17,
    fontWeight: '600',
  },

  // Footer
  footerText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
});
