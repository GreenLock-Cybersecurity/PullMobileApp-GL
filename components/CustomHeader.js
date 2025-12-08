import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Logo } from '@/components/OptimizedImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationDropdown from './NotificationDropdown';

// Use local logo asset (cached, instant loading)
const LOGO_SOURCE = require('../assets/logo.png');

// Notification Bell Component - Simple with red dot
function NotificationBell() {
  const { unreadCount, toggleDropdown, fetchNotifications, loadDismissedIds } = useNotificationStore();
  const { user } = useAuthStore();

  // Load dismissed IDs on mount
  useEffect(() => {
    loadDismissedIds();
  }, []);

  // Fetch notifications when user is available
  useEffect(() => {
    if (user?.venue_id_real) {
      fetchNotifications(user.venue_id_real);
      // Polling every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications(user.venue_id_real);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.venue_id_real]);

  return (
    <TouchableOpacity
      onPress={toggleDropdown}
      activeOpacity={0.7}
      style={styles.bellButton}
    >
      <View>
        <Ionicons
          name="notifications-outline"
          size={21}
          color="rgba(255, 255, 255, 0.75)"
        />
        {unreadCount > 0 && <View style={styles.redDot} />}
      </View>
    </TouchableOpacity>
  );
}

export default function CustomHeader({
  title,
  showProfile = true,
  showBackButton = false,
  showNotifications = true,
  onBackPress,
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <>
      <View style={styles.container}>
        <BlurView intensity={60} tint="dark" style={[styles.blurContainer, { paddingTop: insets.top }]}>
          <View style={styles.content}>
              {/* Left side - Back button and/or Page Title */}
              <View style={styles.leftSection}>
                {showBackButton && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="rgba(255, 255, 255, 0.8)" />
                  </TouchableOpacity>
                )}
                {title && (
                  <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
                )}
              </View>

              {/* Center - Logo (absolutely positioned) */}
              <View style={styles.centerSection}>
                <Logo
                  source={LOGO_SOURCE}
                  style={styles.logo}
                />
              </View>

              {/* Right side - Notifications + User Avatar */}
              <View style={styles.rightSection}>
                {showNotifications && <NotificationBell />}
                {showProfile && (
                  <TouchableOpacity style={styles.avatarButton} activeOpacity={0.7}>
                    <View style={styles.avatarContainer}>
                      <LinearGradient
                        colors={['rgba(139, 92, 246, 0.4)', 'rgba(217, 70, 239, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatar}
                      >
                        <Text style={styles.avatarText}>
                          {getInitials(user?.full_name || user?.email)}
                        </Text>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
        </BlurView>
      </View>

      {/* Notification Dropdown */}
      <NotificationDropdown />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(5, 5, 10, 1)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
    position: 'relative',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    gap: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    letterSpacing: -0.3,
  },
  centerSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 38,
    height: 38,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
    gap: 8,
  },
  bellButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: 'rgba(5, 5, 10, 1)',
  },
  avatarButton: {
    position: 'relative',
  },
  avatarContainer: {
    borderRadius: 18,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
