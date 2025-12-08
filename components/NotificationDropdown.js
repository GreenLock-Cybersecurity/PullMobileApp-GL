// components/NotificationDropdown.js - Simple, clean notification dropdown
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Simple notification item with swipe
function NotificationItem({ notification, onDismiss, onPress }) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isGroup = notification.type === 'group';
  const timeAgo = getTimeAgo(notification.createdAt);

  const handleTouchStart = (e) => {
    setStartX(e.nativeEvent.pageX);
  };

  const handleTouchMove = (e) => {
    const diff = e.nativeEvent.pageX - startX;
    if (diff > 0) setOffsetX(Math.min(diff, 120));
  };

  const handleTouchEnd = () => {
    if (offsetX > 60) {
      setDismissed(true);
      onDismiss(notification.id);
    }
    setOffsetX(0);
  };

  return (
    <View style={styles.itemWrapper}>
      {/* Dismiss indicator */}
      {offsetX > 10 && (
        <View style={styles.dismissBg}>
          <Ionicons name="checkmark" size={16} color="#22c55e" />
        </View>
      )}

      <TouchableOpacity
        style={[styles.notificationItem, { transform: [{ translateX: offsetX }] }]}
        onPress={() => onPress(notification)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        activeOpacity={0.8}
      >
        <View style={[styles.dot, isGroup ? styles.dotGroup : styles.dotIndividual]} />
        <View style={styles.textContent}>
          <View style={styles.topRow}>
            <Text style={styles.title}>{isGroup ? 'Grupal' : 'Individual'}</Text>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          <Text style={styles.message} numberOfLines={1}>{notification.message}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationDropdown() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    notifications,
    isDropdownOpen,
    closeDropdown,
    dismissNotification,
    clearAllNotifications,
  } = useNotificationStore();

  const handleNotificationPress = (notification) => {
    closeDropdown();
    if (notification.type === 'group') {
      router.navigate({
        pathname: '/(tabs)/ReservasList/GroupReservaDetalle',
        params: { id: notification.reservationId },
      });
    } else {
      router.navigate({
        pathname: '/(tabs)/ReservasList/ReservaDetalle',
        params: { id: notification.orderId },
      });
    }
  };

  if (!isDropdownOpen) return null;

  return (
    <Modal
      visible={isDropdownOpen}
      transparent
      animationType="fade"
      onRequestClose={closeDropdown}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={closeDropdown}>
        <View />
      </Pressable>

      <View style={[styles.dropdown, { top: insets.top + 56 }]}>
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Pendientes</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearAllNotifications} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.clearBtn}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={28} color="rgba(34, 197, 94, 0.5)" />
              <Text style={styles.emptyText}>Sin pendientes</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} bounces={false} showsVerticalScrollIndicator={false}>
              {notifications.slice(0, 6).map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onDismiss={dismissNotification}
                  onPress={handleNotificationPress}
                />
              ))}
              {notifications.length > 6 && (
                <Text style={styles.moreText}>+{notifications.length - 6} más</Text>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.footer}
              onPress={() => { closeDropdown(); router.push('/(tabs)/ReservasList'); }}
            >
              <Text style={styles.footerText}>Ver todas</Text>
            </TouchableOpacity>
          )}
        </BlurView>
      </View>
    </Modal>
  );
}

function getTimeAgo(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  const h = Math.floor(ms / 3600000);
  const dy = Math.floor(ms / 86400000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${dy}d`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dropdown: {
    position: 'absolute',
    right: 10,
    width: Math.min(SCREEN_WIDTH - 20, 300),
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
  },
  blur: {
    backgroundColor: 'rgba(18, 18, 24, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  clearBtn: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: '500',
  },
  list: {
    maxHeight: 240,
  },
  itemWrapper: {
    position: 'relative',
    marginHorizontal: 6,
    marginVertical: 3,
  },
  dismissBg: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotIndividual: {
    backgroundColor: '#3b82f6',
  },
  dotGroup: {
    backgroundColor: '#a78bfa',
  },
  textContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  time: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
  },
  message: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  moreText: {
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    paddingVertical: 6,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '500',
  },
});
