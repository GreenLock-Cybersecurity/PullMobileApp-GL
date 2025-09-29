import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function EventosList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { events, isLoadingEvents, eventsError, fetchUpcomingEvents } =
    useDataStore();

  // Cargar eventos cuando se monta el componente
  useEffect(() => {
    if (user?.venue_id) {
      fetchUpcomingEvents(user.venue_id);
    }
  }, [user?.venue_id, fetchUpcomingEvents]);

  // Función para refrescar eventos
  const onRefresh = () => {
    if (user?.venue_id) {
      fetchUpcomingEvents(user.venue_id);
    }
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      className="bg-secondary rounded-lg p-4 mb-4 border border-border"
      onPress={() =>
        router.push(`/(tabs)/EventosList/EventoDetalle?id=${item.id}`)
      }
    >
      <View className="flex-row">
        <Image
          source={{
            uri:
              item.poster || 'https://via.placeholder.com/80x80?text=No+Image',
          }}
          className="w-20 h-20 rounded-lg mr-4"
          resizeMode="cover"
        />
        <View className="flex-1">
          <Text className="text-foreground text-lg font-semibold mb-1">
            {item.name}
          </Text>
          <View className="flex-row items-center mb-1">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-muted-foreground text-sm ml-1">
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text className="text-muted-foreground text-sm ml-1">
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="ticket-outline" size={14} color="#10b981" />
            <Text className="text-primary text-sm ml-1 font-medium">
              {item.ticketsSold} / {item.maxTickets || 'unlimited'} sold
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Componente de loading
  const LoadingComponent = () => (
    <View className="flex-1 justify-center items-center py-12">
      <ActivityIndicator size="large" color="#10b981" />
      <Text className="text-muted-foreground text-base mt-4">
        Loading events...
      </Text>
    </View>
  );

  // Componente de error
  const ErrorComponent = () => (
    <View className="flex-1 justify-center items-center py-12">
      <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
      <Text className="text-destructive text-lg mt-4 text-center">
        {eventsError}
      </Text>
      <TouchableOpacity
        className="bg-primary rounded-lg px-4 py-2 mt-4"
        onPress={onRefresh}
      >
        <Text className="text-primary-foreground font-medium">Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyComponent = () => (
    <View className="flex-1 justify-center items-center py-12">
      <Ionicons name="calendar-outline" size={64} color="#6b7280" />
      <Text className="text-muted-foreground text-lg mt-4">
        No upcoming events
      </Text>
      <TouchableOpacity
        className="bg-primary rounded-lg px-4 py-2 mt-4"
        onPress={onRefresh}
      >
        <Text className="text-primary-foreground font-medium">Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-foreground text-2xl font-bold">
            Upcoming Events
          </Text>
          {user?.role === 'admin' && (
            <TouchableOpacity
              className="bg-primary rounded-lg px-4 py-2"
              onPress={() => router.push('/(tabs)/EventosList/EventoNuevo')}
            >
              <Text className="text-primary-foreground font-medium">
                Add Event
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mostrar loading, error o lista de eventos */}
        {isLoadingEvents ? (
          <LoadingComponent />
        ) : eventsError ? (
          <ErrorComponent />
        ) : (
          <FlatList
            data={events}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingEvents}
                onRefresh={onRefresh}
                colors={['#10b981']}
                tintColor="#10b981"
              />
            }
            ListEmptyComponent={<EmptyComponent />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
