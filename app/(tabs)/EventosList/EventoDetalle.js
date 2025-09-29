import { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';

export default function EventoDetalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const {
    currentEvent,
    isLoadingEventDetail,
    eventDetailError,
    fetchEventDetail,
    clearCurrentEvent,
  } = useDataStore();

  // Cargar evento cuando se monta el componente
  useEffect(() => {
    if (id) {
      fetchEventDetail(id);
    }

    return () => {
      clearCurrentEvent();
    };
  }, [id, fetchEventDetail, clearCurrentEvent]);

  const onRefresh = () => {
    if (id) {
      fetchEventDetail(id);
    }
  };

  // Componente de loading
  if (isLoadingEventDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-muted-foreground text-base mt-4">
            Loading event details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Componente de error
  if (eventDetailError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-destructive text-lg mt-4 text-center">
            {eventDetailError}
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg px-4 py-2 mt-4"
            onPress={onRefresh}
          >
            <Text className="text-primary-foreground font-medium">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-2" onPress={() => router.back()}>
            <Text className="text-muted-foreground">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si no hay evento
  if (!currentEvent) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Ionicons name="calendar-outline" size={64} color="#6b7280" />
          <Text className="text-foreground text-lg mt-4">Event not found</Text>
          <TouchableOpacity
            className="bg-primary rounded-lg px-4 py-2 mt-4"
            onPress={() => router.back()}
          >
            <Text className="text-primary-foreground font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEventDetail}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        <Image
          source={{
            uri:
              currentEvent.poster ||
              'https://via.placeholder.com/400x256?text=No+Image',
          }}
          className="w-full h-64 rounded-lg mb-6"
          resizeMode="cover"
        />

        <View className="mb-6">
          <Text className="text-foreground text-2xl font-bold mb-2">
            {currentEvent.name}
          </Text>
          <Text className="text-muted-foreground text-base mb-4">
            {currentEvent.description || 'No description available'}
          </Text>
        </View>

        <View className="bg-secondary rounded-lg p-4 mb-6">
          <Text className="text-foreground text-lg font-semibold mb-4">
            Event Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Date</Text>
              <Text className="text-foreground">
                {new Date(currentEvent.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Time</Text>
              <Text className="text-foreground">
                {currentEvent.startTime} - {currentEvent.endTime}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Access Type</Text>
              <Text className="text-foreground capitalize">
                {currentEvent.accessType}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Min Age</Text>
              <Text className="text-foreground">{currentEvent.minAge}+</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Tickets Sold</Text>
              <Text className="text-foreground">
                {currentEvent.ticketsSold} /{' '}
                {currentEvent.maxTickets || 'unlimited'}
              </Text>
            </View>

            {currentEvent.dressCode && (
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Dress Code</Text>
                <Text className="text-foreground">
                  {currentEvent.dressCode}
                </Text>
              </View>
            )}

            {currentEvent.customLocation && (
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Location</Text>
                <Text className="text-foreground">
                  {currentEvent.customLocation}
                </Text>
              </View>
            )}
          </View>
        </View>

        {currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0 && (
          <View className="bg-secondary rounded-lg p-4">
            <Text className="text-foreground text-lg font-semibold mb-4">
              Ticket Types
            </Text>

            {currentEvent.ticketTypes.map((ticket) => (
              <View
                key={ticket.id}
                className="border-b border-border pb-3 mb-3 last:border-b-0 last:mb-0"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-foreground font-medium">
                    {ticket.name}
                  </Text>
                  <Text className="text-primary font-bold">
                    ${ticket.price}
                  </Text>
                </View>
                <Text className="text-muted-foreground text-sm mb-1">
                  {ticket.description}
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-muted-foreground text-xs">
                    Max: {ticket.max} | Commission: ${ticket.commission}
                  </Text>
                  <Text className="text-primary text-xs font-medium">
                    {ticket.sold} sold | {ticket.available} available
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
