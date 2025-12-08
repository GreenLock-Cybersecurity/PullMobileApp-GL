import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

const isExpoGo = !Constants.expoConfig?.extra?.eas?.projectId;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isEnabled = !isExpoGo;
  }

  async registerForPushNotifications() {
    if (!this.isEnabled) {
      return null;
    }

    if (!Device.isDevice) {
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reservations', {
          name: 'Reservaciones',
          description: 'Notificaciones de nuevas reservaciones pendientes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8b5cf6',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });

        await Notifications.setNotificationChannelAsync('bookings', {
          name: 'Reservas Individuales',
          description: 'Notificaciones de nuevas reservas individuales',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8b5cf6',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

      this.expoPushToken = tokenData.data;
      return this.expoPushToken;
    } catch {
      return null;
    }
  }

  async registerTokenWithBackend(venueId, employeeId) {
    if (!this.isEnabled || !this.expoPushToken) {
      return false;
    }

    try {
      await apiClient.post('/notifications/register-token', {
        push_token: this.expoPushToken,
        venue_id: venueId,
        employee_id: employeeId,
        device_type: Platform.OS,
      });
      return true;
    } catch {
      return false;
    }
  }

  async unregisterToken() {
    if (!this.isEnabled || !this.expoPushToken) return;

    try {
      await apiClient.post('/notifications/unregister-token', {
        push_token: this.expoPushToken,
      });
    } catch {
    }
  }

  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    if (!this.isEnabled) return;

    try {
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        }
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          if (onNotificationResponse) {
            onNotificationResponse(response);
          }
        }
      );
    } catch {
    }
  }

  removeNotificationListeners() {
    try {
      if (this.notificationListener) {
        if (typeof this.notificationListener.remove === 'function') {
          this.notificationListener.remove();
        }
        this.notificationListener = null;
      }
      if (this.responseListener) {
        if (typeof this.responseListener.remove === 'function') {
          this.responseListener.remove();
        }
        this.responseListener = null;
      }
    } catch {
    }
  }

  getToken() {
    return this.expoPushToken;
  }

  async scheduleLocalNotification(title, body, data = {}) {
    if (!this.isEnabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
        },
        trigger: null,
      });
    } catch {
    }
  }

  async getBadgeCount() {
    if (!this.isEnabled) return 0;
    try {
      return await Notifications.getBadgeCountAsync();
    } catch {
      return 0;
    }
  }

  async setBadgeCount(count) {
    if (!this.isEnabled) return;
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch {
    }
  }

  async clearAllNotifications() {
    if (!this.isEnabled) return;
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
    } catch {
    }
  }
}

export const notificationService = new NotificationService();
