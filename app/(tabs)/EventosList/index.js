// app/(tabs)/EventosList/index.js - CORREGIDO COMPLETO
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
  ImageBackground,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 640;

export default function EventosList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { 
    events, 
    isLoadingEvents, 
    eventsError, 
    fetchUpcomingEvents,
    venueInfo,
    isLoadingVenue,
    fetchVenueInfo,
  } = useDataStore();

  useEffect(() => {
    if (user?.venue_id_real) {
      fetchVenueInfo(user.venue_id_real);
      fetchUpcomingEvents(user.venue_id_real);
    }
  }, [user?.venue_id_real, fetchUpcomingEvents, fetchVenueInfo]);

  const onRefresh = () => {
    if (user?.venue_id_real) {
      fetchVenueInfo(user.venue_id_real);
      fetchUpcomingEvents(user.venue_id_real);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/EventosList/EventoDetalle?id=${item.id}`)}
      activeOpacity={0.8}
      style={{ marginBottom: 16 }}
    >
      <BlurView intensity={60} tint="dark" style={styles.eventCard}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.05)', 'transparent', 'rgba(217, 70, 239, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.eventCardInner}>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: item.poster || 'https://via.placeholder.com/140x140?text=No+Image',
              }}
              style={styles.eventImage}
              resizeMode="cover"
            />
            {item.minPrice && (
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>Q{item.minPrice}</Text>
              </View>
            )}
          </View>

          <View style={styles.eventInfo}>
            <View style={styles.badges}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.25)', 'rgba(217, 70, 239, 0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badge}
              >
                <Ionicons name="calendar-outline" size={12} color="rgb(200, 180, 255)" />
                <Text style={styles.badgeTextPurple}>{formatDate(item.date)}</Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(34, 211, 238, 0.25)', 'rgba(6, 182, 212, 0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badge}
              >
                <Ionicons name="time-outline" size={12} color="rgb(103, 232, 249)" />
                <Text style={styles.badgeTextCyan}>
                  {item.startTime?.slice(0, 5)} - {item.endTime?.slice(0, 5)}
                </Text>
              </LinearGradient>
            </View>

            <Text style={styles.eventName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.details}>
              {venueInfo?.name && (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color="rgb(52, 211, 153)" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {venueInfo.name}
                  </Text>
                </View>
              )}

              {item.dressCode && (
                <View style={styles.detailItem}>
                  <Ionicons name="shirt-outline" size={14} color="rgb(232, 121, 249)" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.dressCode}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!isSmallScreen && (
            <View style={styles.buttonContainer}>
              <LinearGradient
                colors={['transparent', 'rgba(139, 92, 246, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewButton}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color="rgba(167, 139, 250, 0.9)" />
              </LinearGradient>
            </View>
          )}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const LoadingComponent = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
      <Text style={styles.loadingText}>Loading events...</Text>
    </View>
  );

  const ErrorComponent = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
      <Text style={styles.errorText}>{eventsError}</Text>
      <TouchableOpacity onPress={onRefresh} activeOpacity={0.8} style={{ marginTop: 16 }}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
      <Text style={styles.emptyText}>No events available</Text>
    </View>
  );

  const backgroundImage = venueInfo?.image 
    ? { uri: venueInfo.image }
    : require('../../../assets/fondo.png');

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      
      <SafeAreaView style={{ flex: 1 }}>
        {isLoadingVenue ? (
          <View style={styles.venueBanner}>
            <ActivityIndicator size="small" color="rgba(139, 92, 246, 0.9)" />
          </View>
        ) : venueInfo && (
          <View style={styles.venueBanner}>
            <View style={styles.venueAvatarContainer}>
              <LinearGradient
                colors={['rgba(167, 139, 250, 0.6)', 'rgba(232, 121, 249, 0.6)', 'rgba(139, 92, 246, 0.6)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.venueAvatarGradient}
              >
                <Image
                  source={{
                    uri: venueInfo.image || 'https://via.placeholder.com/120x120?text=Venue',
                  }}
                  style={styles.venueAvatar}
                  resizeMode="cover"
                />
              </LinearGradient>
            </View>
            
            <View style={styles.venueInfo}>
              <Text style={styles.venueTitle}>{venueInfo.name}</Text>
              <View style={styles.venueLocation}>
                <Ionicons name="location" size={16} color="rgb(52, 211, 153)" />
                <Text style={styles.venueLocationText}>
                  {venueInfo.long_location || venueInfo.location}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.container}>
          <Text style={styles.title}>Your Events</Text>

          {isLoadingEvents ? (
            <LoadingComponent />
          ) : eventsError ? (
            <ErrorComponent />
          ) : (
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={(item, index) => item.id?.toString() || `event-${index}`}
              showsVerticalScrollIndicator={false}
              initialNumToRender={5}
              refreshControl={
                <RefreshControl
                  refreshing={isLoadingEvents}
                  onRefresh={onRefresh}
                  tintColor="rgba(139, 92, 246, 0.9)"
                />
              }
              ListEmptyComponent={<EmptyComponent />}
            />
          )}
        </View>

        {user?.role === 'staff' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/(tabs)/EventosList/EventoNuevo')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.9)', 'rgba(217, 70, 239, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  venueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  venueAvatarContainer: {
    position: 'relative',
  },
  venueAvatarGradient: {
    width: isSmallScreen ? 80 : 100,
    height: isSmallScreen ? 80 : 100,
    borderRadius: isSmallScreen ? 40 : 50,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 37 : 47,
  },
  venueInfo: {
    flex: 1,
  },
  venueTitle: {
    color: 'white',
    fontSize: isSmallScreen ? 24 : 32,
    fontWeight: '400',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  venueLocationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '300',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageContainer: {
    width: isSmallScreen ? 110 : 140,
    height: isSmallScreen ? 110 : 140,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  priceTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  eventInfo: {
    flex: 1,
    padding: isSmallScreen ? 10 : 12,
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 5 : 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  badgeTextPurple: {
    color: 'rgb(200, 180, 255)',
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '500',
  },
  badgeTextCyan: {
    color: 'rgb(103, 232, 249)',
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '500',
  },
  eventName: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: isSmallScreen ? 20 : 24,
  },
  details: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: '300',
    flex: 1,
  },
  buttonContainer: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewButtonText: {
    color: 'rgba(167, 139, 250, 0.9)',
    fontSize: 12,
    fontWeight: '400',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    marginTop: 16,
  },
  errorText: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: 16,
    fontWeight: '300',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
  },
  gradientButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '400',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});