import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ReservasList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    bookings,
    isLoadingBookings,
    bookingsError,
    bookingsPagination,
    currentBookingFilter,
    fetchBookings,
    loadMoreBookings,
    changeBookingFilter,
    clearBookings,
  } = useDataStore();

  const [selectedStatus, setSelectedStatus] = useState('All');

  // Mapeo de estados para mostrar vs enviar al API
  const statusOptions = [
    { display: 'All', value: 'All' },
    { display: 'Pending', value: 'pending' },
    { display: 'Confirmed', value: 'confirmed' },
    { display: 'Cancelled', value: 'cancelled' },
    { display: 'Paid', value: 'paid' },
    { display: 'Rejected', value: 'rejected' },
    { display: 'Modified', value: 'modified' },
  ];

  // Cargar bookings cuando se monta el componente
  useEffect(() => {
    if (user?.venue_id) {
      fetchBookings(user.venue_id, { status: 'All', page: 1, resetList: true });
    }

    return () => {
      clearBookings();
    };
  }, [user?.venue_id]);

  const groupedBookings = useMemo(() => {
    const grouped = bookings.reduce((acc, booking) => {
      const date = booking.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(booking);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, data]) => ({
        title: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        data,
      }));
  }, [bookings]);

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

  const getStatusDisplayName = (status) => {
    // Buscar por el valor del status, no por display
    const option = statusOptions.find((opt) => opt.value === status);
    return option ? option.display : status;
  };

  const handleStatusFilter = async (statusValue) => {
    const option = statusOptions.find((opt) => opt.value === statusValue);
    setSelectedStatus(option ? option.display : 'All');

    if (user?.venue_id) {
      await changeBookingFilter(user.venue_id, statusValue);
    }
  };

  const handleLoadMore = async () => {
    if (user?.venue_id && bookingsPagination.hasMore && !isLoadingBookings) {
      await loadMoreBookings(user.venue_id);
    }
  };

  const onRefresh = async () => {
    if (user?.venue_id) {
      const currentFilter = statusOptions.find(
        (opt) => opt.display === selectedStatus
      );
      await fetchBookings(user.venue_id, {
        status: currentFilter ? currentFilter.value : 'All',
        page: 1,
        resetList: true,
      });
    }
  };

  const renderBooking = ({ item }) => (
    <TouchableOpacity
      className="bg-secondary rounded-lg p-4 mb-3 border border-border"
      onPress={() =>
        router.push(`/(tabs)/ReservasList/ReservaDetalle?id=${item.id}`)
      }
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-foreground text-lg font-semibold mb-1">
            {item.customerName}
          </Text>
          <View className="flex-row items-center mb-1">
            <Ionicons name="person" size={16} color="#6b7280" />
            <Text className="text-muted-foreground text-sm ml-1">
              {item.guests} {item.guests === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={item.type === 'mesa' ? 'restaurant' : 'wine'}
              size={16}
              color="#10b981"
            />
            <Text className="text-primary text-sm ml-1 font-medium capitalize">
              {item.type}
            </Text>
          </View>
          {item.totalAmount && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="cash" size={16} color="#6b7280" />
              <Text className="text-muted-foreground text-sm ml-1">
                ${item.totalAmount}
              </Text>
            </View>
          )}
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: getStatusColor(item.status) }}
          >
            {getStatusDisplayName(item.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View className="bg-background py-2">
      <Text className="text-foreground text-lg font-semibold">
        {section.title}
      </Text>
    </View>
  );

  const renderLoadMoreButton = () => {
    if (!bookingsPagination.hasMore) return null;

    return (
      <TouchableOpacity
        className="bg-primary rounded-lg p-4 mx-4 mb-4"
        onPress={handleLoadMore}
        disabled={isLoadingBookings}
      >
        {isLoadingBookings ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-primary-foreground text-center font-medium">
            Load More ({bookingsPagination.totalCount - bookings.length}{' '}
            remaining)
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Loading inicial
  if (isLoadingBookings && bookings.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-muted-foreground text-base mt-4">
            Loading bookings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (bookingsError && bookings.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-destructive text-lg mt-4 text-center">
            {bookingsError}
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg px-4 py-2 mt-4"
            onPress={onRefresh}
          >
            <Text className="text-primary-foreground font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Filtros de estado - CORREGIDO */}
        <View className="border-b border-border">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            style={{ maxHeight: 60 }} // ALTURA FIJA
          >
            {statusOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                className={`px-4 py-2 rounded-lg ${
                  selectedStatus === option.display
                    ? 'bg-primary'
                    : 'bg-secondary'
                } ${index < statusOptions.length - 1 ? 'mr-2' : ''}`} // Margen derecho excepto último
                onPress={() => handleStatusFilter(option.value)}
                disabled={isLoadingBookings}
                style={{ minWidth: 'auto' }} // Sin ancho mínimo
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedStatus === option.display
                      ? 'text-primary-foreground'
                      : 'text-foreground'
                  }`}
                  numberOfLines={1} // Una sola línea
                >
                  {option.display}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de bookings */}
        <SectionList
          sections={groupedBookings}
          renderItem={renderBooking}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingBookings && bookings.length === 0}
              onRefresh={onRefresh}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-12">
              <Ionicons name="restaurant-outline" size={64} color="#6b7280" />
              <Text className="text-muted-foreground text-lg mt-4">
                No bookings found
              </Text>
            </View>
          }
          ListFooterComponent={renderLoadMoreButton}
        />
      </View>
    </SafeAreaView>
  );
}
