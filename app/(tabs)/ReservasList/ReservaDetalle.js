import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ReservaDetalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    currentBooking,
    isLoadingBookingDetail,
    bookingDetailError,
    fetchBookingDetail,
    updateBookingStatus,
    clearCurrentBooking,
    currentBookingModifications,
    processBookingModifications,
  } = useDataStore();

  useEffect(() => {
    if (id) {
      fetchBookingDetail(id);
    }

    return () => {
      clearCurrentBooking();
    };
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10b981'; // Verde
      case 'cancelled':
        return '#f97316'; // Naranja
      case 'rejected':
        return '#ef4444'; // Rojo
      case 'checked_in':
        return '#3b82f6'; // Azul
      case 'modified':
        return '#8b5cf6'; // Morado
      default: // pending
        return '#f59e0b'; // Amarillo
    }
  };

  const handleStatusChange = useCallback(
    async (newStatus) => {
      const freshAuthState = useAuthStore.getState();
      const currentUser = freshAuthState.user;

      if (!freshAuthState.isAuthenticated || !currentUser) {
        Alert.alert('Error', 'Please login again to continue.');
        router.replace('/');
        return;
      }

      if (
        !currentUser.venue_id ||
        !currentUser.organization_id ||
        !currentUser.id
      ) {
        Alert.alert('Error', 'Incomplete user data. Please login again.');
        router.replace('/');
        return;
      }

      const statusMap = {
        Accept: 'confirmed',
        Reject: 'cancelled',
      };

      const backendStatus = statusMap[newStatus] || newStatus;

      Alert.alert(
        `${newStatus} Reservation`,
        `Are you sure you want to ${newStatus.toLowerCase()} this reservation?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: newStatus,
            style: newStatus === 'Reject' ? 'destructive' : 'default',
            onPress: async () => {
              setIsUpdating(true);

              try {
                const result = await updateBookingStatus(
                  id,
                  backendStatus,
                  currentUser.venue_id,
                  currentUser.organization_id,
                  currentUser.id
                );

                if (result.success) {
                  Alert.alert('Success', result.message);
                  router.back();
                } else {
                  Alert.alert(
                    'Error',
                    result.error || 'Failed to update reservation status'
                  );
                }
              } catch (error) {
                console.error('🏠 Exception:', error);
                Alert.alert('Error', 'Network error occurred');
              }

              setIsUpdating(false);
            },
          },
        ]
      );
    },
    [id, updateBookingStatus, router]
  );

  const handleModificationAction = useCallback(
    async (action) => {
      const freshAuthState = useAuthStore.getState();
      const currentUser = freshAuthState.user;

      if (!freshAuthState.isAuthenticated || !currentUser) {
        Alert.alert('Error', 'Please login again to continue.');
        router.replace('/');
        return;
      }

      const actionText = action === 'accept' ? 'Accept' : 'Reject';

      Alert.alert(
        `${actionText} Modifications`,
        `Are you sure you want to ${action} the guest modifications?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionText,
            style: action === 'reject' ? 'destructive' : 'default',
            onPress: async () => {
              setIsUpdating(true);

              try {
                const result = await processBookingModifications(
                  id,
                  action,
                  currentUser.venue_id,
                  currentUser.organization_id,
                  currentUser.id
                );

                if (result.success) {
                  Alert.alert('Success', result.message);
                  router.back();
                } else {
                  Alert.alert(
                    'Error',
                    result.error || 'Failed to process modifications'
                  );
                }
              } catch (error) {
                console.error('Exception:', error);
                Alert.alert('Error', 'Network error occurred');
              }

              setIsUpdating(false);
            },
          },
        ]
      );
    },
    [id, processBookingModifications, router]
  );

  if (isLoadingBookingDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-foreground text-lg mt-4">
            Loading reservation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingDetailError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-foreground text-lg text-center mt-4">
            {bookingDetailError}
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 px-6 mt-6"
            onPress={() => fetchBookingDetail(id)}
          >
            <Text className="text-primary-foreground font-medium">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentBooking) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg">Reservation not found</Text>
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 px-6 mt-4"
            onPress={() => router.back()}
          >
            <Text className="text-primary-foreground font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPendingStatus =
    currentBooking.status === 'pending' || currentBooking.status === 'Pending';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-secondary rounded-lg p-6 mb-6">
          <View className="items-center mb-6">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-3"
              style={{
                backgroundColor: `${getStatusColor(currentBooking.status)}20`,
              }}
            >
              <Ionicons
                name={
                  currentBooking.status === 'confirmed' ||
                  currentBooking.status === 'Aceptada'
                    ? 'checkmark'
                    : currentBooking.status === 'cancelled' ||
                      currentBooking.status === 'Rechazada'
                    ? 'close'
                    : 'time'
                }
                size={32}
                color={getStatusColor(currentBooking.status)}
              />
            </View>
            <Text className="text-foreground text-2xl font-bold mb-2">
              {currentBooking.customerName}
            </Text>
            <View
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: `${getStatusColor(currentBooking.status)}20`,
              }}
            >
              <Text
                className="text-lg font-medium capitalize"
                style={{ color: getStatusColor(currentBooking.status) }}
              >
                {currentBooking.status}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-secondary rounded-lg p-4 mb-6">
          <Text className="text-foreground text-lg font-semibold mb-4">
            Customer Information
          </Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">Email</Text>
              <Text className="text-foreground font-medium">
                {currentBooking.email}
              </Text>
            </View>

            {currentBooking.phone && (
              <View className="flex-row justify-between items-center py-2 border-b border-border">
                <Text className="text-muted-foreground">Phone</Text>
                <Text className="text-foreground font-medium">
                  {currentBooking.phone}
                </Text>
              </View>
            )}
          </View>
        </View>

        {currentBooking?.status === 'modified' &&
          currentBookingModifications?.hasModifications && (
            <View className="bg-secondary rounded-lg p-4 mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="people-outline" size={20} color="#8b5cf6" />
                <Text className="text-foreground text-lg font-semibold ml-2">
                  Guest Modifications
                </Text>
              </View>

              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4">
                <Text className="text-purple-700 dark:text-purple-300 text-sm">
                  The customer has requested changes to the guest list.
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-4">
                {currentBookingModifications.guestsToRemove > 0 && (
                  <View className="flex-row items-center bg-red-50 dark:bg-red-900/20 rounded-lg p-3 flex-1 mr-2">
                    <Ionicons
                      name="remove-circle-outline"
                      size={20}
                      color="#ef4444"
                    />
                    <View className="ml-2">
                      <Text className="text-red-600 dark:text-red-400 font-medium">
                        {currentBookingModifications.guestsToRemove}
                      </Text>
                      <Text className="text-red-500 dark:text-red-400 text-xs">
                        to remove
                      </Text>
                    </View>
                  </View>
                )}

                {currentBookingModifications.guestsToAdd > 0 && (
                  <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex-1 ml-2">
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#10b981"
                    />
                    <View className="ml-2">
                      <Text className="text-green-600 dark:text-green-400 font-medium">
                        {currentBookingModifications.guestsToAdd}
                      </Text>
                      <Text className="text-green-500 dark:text-green-400 text-xs">
                        to add
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View className="flex-row space-x-4">
                <TouchableOpacity
                  className={`flex-1 bg-destructive rounded-lg py-3 ${
                    isUpdating ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleModificationAction('reject')}
                  disabled={isUpdating}
                >
                  <View className="flex-row items-center justify-center">
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name="close-outline"
                        size={20}
                        color="#ffffff"
                      />
                    )}
                    <Text className="text-destructive-foreground text-center font-medium ml-2">
                      {isUpdating ? 'Processing...' : 'Reject'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 bg-primary rounded-lg py-3 ${
                    isUpdating ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleModificationAction('accept')}
                  disabled={isUpdating}
                >
                  <View className="flex-row items-center justify-center">
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name="checkmark-outline"
                        size={20}
                        color="#ffffff"
                      />
                    )}
                    <Text className="text-primary-foreground text-center font-medium ml-2">
                      {isUpdating ? 'Processing...' : 'Accept'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

        <View className="bg-secondary rounded-lg p-4">
          <Text className="text-foreground text-lg font-semibold mb-4">
            Reservation Details
          </Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">Date</Text>
              <Text className="text-foreground font-medium">
                {new Date(currentBooking.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {currentBooking.time && (
              <View className="flex-row justify-between items-center py-2 border-b border-border">
                <Text className="text-muted-foreground">Time</Text>
                <Text className="text-foreground font-medium">
                  {currentBooking.time}
                </Text>
              </View>
            )}

            {currentBooking.endTime && (
              <View className="flex-row justify-between items-center py-2 border-b border-border">
                <Text className="text-muted-foreground">End Time</Text>
                <Text className="text-foreground font-medium">
                  {currentBooking.endTime}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">Guests</Text>
              <View className="flex-row items-center">
                <Ionicons name="person" size={16} color="#10b981" />
                <Text className="text-foreground font-medium ml-1">
                  {currentBooking.guests}{' '}
                  {currentBooking.guests === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">Type</Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={currentBooking.type === 'mesa' ? 'restaurant' : 'wine'}
                  size={16}
                  color="#10b981"
                />
                <Text className="text-foreground font-medium ml-1 capitalize">
                  {currentBooking.type}
                </Text>
              </View>
            </View>

            {currentBooking.totalAmount && (
              <View className="flex-row justify-between items-center py-2 border-b border-border">
                <Text className="text-muted-foreground">Total Amount</Text>
                <Text className="text-foreground font-medium">
                  €{currentBooking.totalAmount}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-muted-foreground">Status</Text>
              <Text
                className="font-medium capitalize"
                style={{ color: getStatusColor(currentBooking.status) }}
              >
                {currentBooking.status}
              </Text>
            </View>
          </View>
        </View>

        {isPendingStatus && (
          <View className="flex-row space-x-4 mt-6">
            <TouchableOpacity
              className={`flex-1 bg-destructive rounded-lg py-3 ${
                isUpdating ? 'opacity-50' : ''
              }`}
              onPress={() => handleStatusChange('Reject')}
              disabled={isUpdating}
            >
              <View className="flex-row items-center justify-center">
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="close-outline" size={20} color="#ffffff" />
                )}
                <Text className="text-destructive-foreground text-center font-medium ml-2">
                  {isUpdating ? 'Updating...' : 'Reject'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 bg-primary rounded-lg py-3 ${
                isUpdating ? 'opacity-50' : ''
              }`}
              onPress={() => handleStatusChange('Accept')}
              disabled={isUpdating}
            >
              <View className="flex-row items-center justify-center">
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name="checkmark-outline"
                    size={20}
                    color="#ffffff"
                  />
                )}
                <Text className="text-primary-foreground text-center font-medium ml-2">
                  {isUpdating ? 'Updating...' : 'Accept'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
