// app/(tabs)/ReservasList/VIPListDetalle.js - VIP List Detail View
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Animated,
  Share,
  Linking,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { vipListService } from '@/services/vipListService';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';

const HEADER_CONTENT_HEIGHT = 56;

export default function VIPListDetalle() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const { venueCurrency, selectedVenue } = useDataStore();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState('48');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [bottles, setBottles] = useState([]);
  const [bottlesTotal, setBottlesTotal] = useState(0);
  const [bottlesBudget, setBottlesBudget] = useState(0);
  const [remainingCredit, setRemainingCredit] = useState(0);

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  useEffect(() => {
    if (id) {
      fetchReservationDetail();
    }
  }, [id]);

  // Fetch bottles when reservation is completed and has bottles selected
  useEffect(() => {
    if (reservation?.bottles_selected_by_host && reservation?.status === 'completed') {
      fetchBottles();
    }
  }, [reservation?.bottles_selected_by_host, reservation?.status]);

  const fetchBottles = async () => {
    try {
      const result = await vipListService.getBottles(id);
      if (result.success) {
        setBottles(result.data || []);
        setBottlesTotal(result.total_value || result.total || 0);
        setBottlesBudget(result.budget || 0);
        setRemainingCredit(result.remaining_credit || 0);
      }
    } catch (err) {
      console.log('Error fetching bottles:', err);
    }
  };

  const fetchReservationDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await vipListService.getById(id);

      if (result.success) {
        // Combine reservation data with guests and stats
        setReservation({
          ...result.data,
          guests: result.guests || [],
          stats: result.stats || {},
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load VIP list details');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GTQ': 'Q',
      'MXN': '$',
      'GBP': '£',
    };
    return symbols[currency] || currency || 'Q';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#10b981';
      case 'closed': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      open: 'Open',
      closed: 'Closed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCloseList = async () => {
    const hours = parseInt(deadlineHours);
    if (!hours || hours < 1) {
      Alert.alert('Error', 'Please enter a valid number of hours (minimum 1)');
      return;
    }

    setIsClosing(true);
    try {
      const result = await vipListService.close(id, hours);

      if (result.success) {
        setShowCloseModal(false);
        Alert.alert(
          'Success',
          `List closed! Guests have ${hours} hours to pay.`,
          [{ text: 'OK', onPress: fetchReservationDetail }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to close list');
    } finally {
      setIsClosing(false);
    }
  };

  const handleFinalizeList = async () => {
    setIsFinalizing(true);
    try {
      const result = await vipListService.finalize(id);

      if (result.success) {
        setShowFinalizeModal(false);

        // Check if there's a bottle selection URL to share
        const bottleUrl = result.data?.bottle_selection_url;
        const totalConsumables = result.data?.total_consumables || 0;
        const hostName = reservation?.host_name || 'Host';
        const eventName = getEventName();

        if (bottleUrl && totalConsumables > 0) {
          // Show alert with option to share bottle link via WhatsApp
          Alert.alert(
            '🎉 ¡Lista Finalizada!',
            `El host tiene Q${totalConsumables.toFixed(0)} para elegir botellas.\n\n¿Quieres enviarle el link por WhatsApp?`,
            [
              {
                text: 'Solo Cerrar',
                style: 'cancel',
                onPress: fetchReservationDetail
              },
              {
                text: '📱 Enviar WhatsApp',
                onPress: () => {
                  // Build exciting WhatsApp message
                  const message = `🍾✨ ¡${hostName}! ¡Tu reserva VIP está lista! ✨🍾\n\n` +
                    `🎊 Tenés *Q${totalConsumables.toFixed(0)}* para elegir tus botellas para *${eventName}*\n\n` +
                    `🥂 Entrá acá y elegí las que más te gusten:\n${bottleUrl}\n\n` +
                    `⏰ ¡No te tardes mucho! Las mejores botellas vuelan 🚀\n\n` +
                    `Nos vemos en la fiesta 🎧🔥`;

                  // Get host phone if available
                  const hostPhone = reservation?.host_phone || '';
                  const hostPrefix = reservation?.host_phone_prefix || '+502';

                  if (hostPhone) {
                    const cleanPhone = `${hostPrefix}${hostPhone}`.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
                    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                    Linking.openURL(whatsappUrl);
                  } else {
                    // No phone, just share the message
                    Share.share({ message, title: 'Link de Botellas VIP' });
                  }
                  fetchReservationDetail();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Lista Finalizada',
            'VIP list finalized successfully.',
            [{ text: 'OK', onPress: fetchReservationDetail }]
          );
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to finalize list');
    } finally {
      setIsFinalizing(false);
    }
  };

  const getTrackingUrl = () => {
    if (!reservation?.tracking_link_code) return null;
    // Build the full tracking URL from the code
    return `https://web.pullevents.com/es/vip/track/${reservation.tracking_link_code}`;
  };

  const getEventName = () => {
    return reservation?.events?.name || reservation?.event_name || 'Event';
  };

  const getEventDate = () => {
    return reservation?.events?.event_date || reservation?.event_date;
  };

  const getVenueName = () => {
    return reservation?.events?.venues?.name || reservation?.venue_name || '';
  };

  const handleShareLink = async () => {
    const trackingUrl = getTrackingUrl();
    if (!trackingUrl) {
      Alert.alert('Error', 'No tracking link available');
      return;
    }

    const eventName = getEventName();
    const eventDate = getEventDate();
    const hostName = reservation?.host_name || 'alguien';

    // Format date nicely in Spanish
    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    // Build attractive message with emojis
    let message = `🔥 ¡Únete a la reserva de ${hostName} para ${eventName}! 🍸\n\n`;
    if (formattedDate) {
      message += `📅 ${formattedDate}\n\n`;
    }
    message += `👉 Reservá tu lugar en la lista VIP:\n${trackingUrl}\n\n`;
    message += `¡No te lo podés perder! 🥂🎧`;

    try {
      await Share.share({
        message,
        title: 'Lista VIP - Invitación',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  // Calculate remaining time until payment deadline (returns Spanish for WhatsApp message)
  const getRemainingTime = () => {
    if (!reservation?.payment_deadline) return null;
    const deadline = new Date(reservation.payment_deadline);
    const now = new Date();
    const diffMs = deadline - now;

    if (diffMs <= 0) return 'expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} día${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} minutos`;
  };

  // Send WhatsApp reminder to guest pending payment
  const handleWhatsAppReminder = (guest) => {
    // Get guest phone - check various possible field names
    const guestPhone = guest.phone || guest.phone_number || '';
    const guestPrefix = guest.phone_prefix || guest.host_phone_prefix || '+502';

    if (!guestPhone) {
      Alert.alert('No Phone', 'This guest does not have a phone number registered.');
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = `${guestPrefix}${guestPhone}`.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');

    const trackingUrl = getTrackingUrl();
    const eventName = getEventName();
    const eventDate = getEventDate();
    const remainingTime = getRemainingTime();
    const guestName = guest.name || 'Guest';

    // Calculate their price based on gender
    const guestPrice = guest.gender === 'male' ? malePriceWithFee : femalePriceWithFee;

    // Format event date nicely (Guatemalan Spanish)
    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    // Get host name for personalized message
    const hostFullName = reservation?.host_name
      ? `${reservation.host_name}${reservation.host_last_name ? ' ' + reservation.host_last_name : ''}`
      : '';
    const reservationType = reservation?.table_or_bar === 'table' ? 'mesa' : 'barra';

    // Build personalized WhatsApp message with emojis (Guatemalan Spanish)
    let message = `¡Hola ${guestName}! 🎉✨\n\n`;

    if (hostFullName) {
      message += `Te recordamos tu lugar en la ${reservationType} de *${hostFullName}* para *${eventName}*! 🔥\n\n`;
    } else {
      message += `Te escribimos para recordarte tu lugar en la lista VIP de *${eventName}*! 🔥\n\n`;
    }

    if (formattedDate) {
      message += `📅 ${formattedDate}\n`;
    }

    message += `💰 Tu entrada: *${currencySymbol}${guestPrice}*\n\n`;

    if (remainingTime && remainingTime !== 'expired') {
      message += `⏰ Tenés *${remainingTime}* para completar tu pago!\n\n`;
    } else if (remainingTime === 'expired') {
      message += `⚠️ El tiempo de pago ya pasó! Pagá lo antes posible para asegurar tu lugar.\n\n`;
    }

    message += `¡No te podés perder esta noche increíble! 🙌🎶\n\n`;
    message += `👉 Pagá aquí: ${trackingUrl}\n\n`;
    message += `¡Nos vemos ahí! 🥳`;

    // Open WhatsApp with the message using wa.me URL (more reliable across devices)
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Make sure it is installed.');
    });
  };

  if (isLoading) {
    return (
      <BackgroundGlow>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgb(239, 68, 68)" />
            <Text style={styles.loadingText}>Loading VIP list...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (error || !reservation) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{error || 'VIP list not found'}</Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ marginTop: 20 }}>
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={18} color="white" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  const currency = reservation.currency || venueCurrency || 'GTQ';
  const currencySymbol = getCurrencySymbol(currency);
  const guests = reservation.guests || [];
  const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
  const paidGuests = guests.filter(g => g.paid_at);
  const menConfirmed = confirmedGuests.filter(g => g.gender === 'male').length;
  const womenConfirmed = confirmedGuests.filter(g => g.gender === 'female').length;
  const canClose = reservation.status === 'open';

  // Calculate prices with fee for both genders
  const malePrice = reservation.male_price || reservation.price_per_person || 0;
  const femalePrice = reservation.female_price || reservation.price_per_person || 0;
  const malePriceWithFee = (malePrice * 1.15).toFixed(2);
  const femalePriceWithFee = (femalePrice * 1.15).toFixed(2);

  return (
    <BackgroundGlow>
      <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={[styles.scrollView, { paddingTop: HEADER_CONTENT_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(reservation.status)}20`, borderColor: `${getStatusColor(reservation.status)}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(reservation.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(reservation.status) }]}>
                {getStatusDisplayName(reservation.status)}
              </Text>
            </View>

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Ionicons
                name={reservation.table_or_bar === 'table' ? 'restaurant' : 'beer'}
                size={14}
                color="rgb(168, 85, 255)"
              />
              <Text style={styles.typeBadgeText}>
                {reservation.table_or_bar === 'table' ? 'Table' : 'Bar'}
              </Text>
            </View>
          </View>

          {/* Title & Info */}
          <View style={styles.titleSection}>
            <Text style={styles.reservationTitle}>
              {reservation.reservation_name || 'VIP List'}
            </Text>
            {reservation.description && (
              <Text style={styles.descriptionText}>{reservation.description}</Text>
            )}
          </View>

          {/* Price Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <Text style={styles.priceHeaderLabel}>Price per person</Text>
              <Text style={styles.priceHeaderNote}>includes management fee</Text>
            </View>
            <View style={styles.priceGenderRow}>
              {/* Male Price */}
              <View style={styles.priceGenderItem}>
                <View style={styles.priceGenderHeader}>
                  <Ionicons name="male" size={16} color="rgb(59, 130, 246)" />
                  <Text style={styles.priceGenderLabel}>Men</Text>
                </View>
                <Text style={styles.priceGenderValue}>
                  {currencySymbol}{malePriceWithFee}
                </Text>
              </View>
              {/* Female Price */}
              <View style={styles.priceGenderItem}>
                <View style={styles.priceGenderHeader}>
                  <Ionicons name="female" size={16} color="rgb(236, 72, 153)" />
                  <Text style={styles.priceGenderLabel}>Women</Text>
                </View>
                <Text style={styles.priceGenderValue}>
                  {currencySymbol}{femalePriceWithFee}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagGuests]}>
              <Ionicons name="people" size={14} color="rgb(168, 85, 255)" />
              <Text style={[styles.tagText, styles.tagTextPurple]}>
                {confirmedGuests.length} Confirmed
              </Text>
            </View>
            {reservation.status === 'closed' && (
              <View style={[styles.tag, styles.tagPaid]}>
                <Ionicons name="checkmark-circle" size={14} color="rgb(16, 185, 129)" />
                <Text style={[styles.tagText, styles.tagTextGreen]}>
                  {paidGuests.length} Paid
                </Text>
              </View>
            )}
          </View>

          {/* Occupancy Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(168, 85, 255, 0.1)' }]}>
                <Ionicons name="analytics-outline" size={16} color="rgb(168, 85, 255)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(192, 132, 252)' }]}>Occupancy</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.occupancyRow}>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyNumber}>{confirmedGuests.length}</Text>
                  <Text style={styles.occupancyLabel}>Confirmed</Text>
                </View>
                <Text style={styles.occupancyDivider}>/</Text>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyExpected}>
                    {(reservation.expected_men || 0) + (reservation.expected_women || 0)}
                  </Text>
                  <Text style={styles.occupancyLabel}>Expected</Text>
                </View>
              </View>

              <View style={styles.genderBreakdown}>
                <View style={styles.genderItem}>
                  <Ionicons name="male" size={16} color="rgb(59, 130, 246)" />
                  <Text style={styles.genderText}>
                    {menConfirmed} / {reservation.expected_men || 0} men
                  </Text>
                </View>
                <View style={styles.genderItem}>
                  <Ionicons name="female" size={16} color="rgb(236, 72, 153)" />
                  <Text style={styles.genderText}>
                    {womenConfirmed} / {reservation.expected_women || 0} women
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Event Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={16} color="rgb(239, 68, 68)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(252, 165, 165)' }]}>Event</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{getEventName()}</Text>
              <Text style={styles.cardSubtitle}>{getVenueName()}</Text>
              {getEventDate() && (
                <Text style={styles.eventDateText}>
                  {new Date(getEventDate()).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>
          </View>

          {/* Host Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(110, 231, 183)' }]}>Host</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>
                {reservation.host_name} {reservation.host_last_name}
              </Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.detailText}>{reservation.host_email}</Text>
                </View>
                {reservation.host_phone && (
                  <View style={styles.detailItem}>
                    <Ionicons name="call-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                    <Text style={styles.detailText}>
                      {reservation.host_phone_prefix} {reservation.host_phone}
                    </Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Ionicons
                    name={reservation.host_gender === 'male' ? 'male' : 'female'}
                    size={16}
                    color={reservation.host_gender === 'male' ? 'rgb(59, 130, 246)' : 'rgb(236, 72, 153)'}
                  />
                  <Text style={styles.detailText}>
                    {reservation.host_gender === 'male' ? 'Male' : 'Female'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Deadline Section (if closed) */}
          {reservation.status === 'closed' && reservation.payment_deadline && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="time-outline" size={16} color="rgb(245, 158, 11)" />
                </View>
                <Text style={[styles.sectionLabel, { color: 'rgb(252, 211, 77)' }]}>Payment Deadline</Text>
              </View>
              <View style={[styles.sectionCard, styles.deadlineCard]}>
                <Text style={styles.deadlineText}>
                  {formatDate(reservation.payment_deadline)}
                </Text>
              </View>
            </View>
          )}

          {/* Guests Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="people-outline" size={16} color="rgb(59, 130, 246)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(96, 165, 250)' }]}>
                Guests ({confirmedGuests.length})
              </Text>
            </View>
            <View style={styles.sectionCard}>
              {confirmedGuests.length === 0 ? (
                <View style={styles.emptyGuests}>
                  <Ionicons name="person-add-outline" size={32} color="rgba(255, 255, 255, 0.2)" />
                  <Text style={styles.emptyGuestsText}>No guests yet</Text>
                  <Text style={styles.emptyGuestsSubtext}>Share the link to get RSVPs</Text>
                </View>
              ) : (
                confirmedGuests.map((guest, index) => (
                  <View key={guest.id} style={styles.guestItem}>
                    <View style={styles.guestInfo}>
                      <View style={[
                        styles.guestAvatar,
                        { backgroundColor: guest.gender === 'male' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(236, 72, 153, 0.2)' }
                      ]}>
                        <Ionicons
                          name={guest.gender === 'male' ? 'male' : 'female'}
                          size={16}
                          color={guest.gender === 'male' ? 'rgb(59, 130, 246)' : 'rgb(236, 72, 153)'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guestName}>
                          {guest.name} {guest.last_name}
                        </Text>
                        <Text style={styles.guestEmail}>{guest.email}</Text>
                      </View>
                    </View>
                    {reservation.status === 'closed' && (
                      guest.paid_at ? (
                        <View style={styles.paidBadge}>
                          <Ionicons name="checkmark" size={12} color="rgb(16, 185, 129)" />
                          <Text style={styles.paidText}>Paid</Text>
                        </View>
                      ) : (
                        <View style={styles.pendingActions}>
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time" size={12} color="rgb(245, 158, 11)" />
                            <Text style={styles.pendingText}>Pending</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleWhatsAppReminder(guest)}
                            activeOpacity={0.7}
                            style={styles.whatsappButton}
                          >
                            <Ionicons name="logo-whatsapp" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Bottles Section (when host has selected bottles) */}
          {reservation.status === 'completed' && reservation.bottles_selected_by_host && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(168, 85, 255, 0.1)' }]}>
                  <Ionicons name="wine-outline" size={16} color="rgb(168, 85, 255)" />
                </View>
                <Text style={[styles.sectionLabel, { color: 'rgb(192, 132, 252)' }]}>
                  Bottles Selected ({bottles.length})
                </Text>
              </View>
              <View style={styles.sectionCard}>
                {bottles.length === 0 ? (
                  <View style={styles.emptyGuests}>
                    <ActivityIndicator size="small" color="rgb(168, 85, 255)" />
                    <Text style={styles.emptyGuestsText}>Loading bottles...</Text>
                  </View>
                ) : (
                  <>
                    {bottles.map((bottle, index) => (
                      <View key={bottle.id || index} style={styles.bottleItem}>
                        <View style={styles.bottleInfo}>
                          {bottle.image ? (
                            <View style={styles.bottleImageWrapper}>
                              <Image
                                source={{ uri: bottle.image }}
                                style={styles.bottleImageActual}
                                resizeMode="contain"
                              />
                            </View>
                          ) : (
                            <View style={styles.bottleAvatar}>
                              <Ionicons name="wine" size={18} color="rgb(168, 85, 255)" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.bottleName}>{bottle.name}</Text>
                            <Text style={styles.bottleBrand}>{bottle.brand}</Text>
                          </View>
                        </View>
                        <View style={styles.bottleQuantity}>
                          <Text style={styles.bottleQtyText}>x{bottle.quantity}</Text>
                          <Text style={styles.bottlePrice}>
                            {currencySymbol}{((bottle.price || 0) * (bottle.quantity || 1)).toFixed(0)}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.bottlesTotalRow}>
                      <Text style={styles.bottlesTotalLabel}>Total Botellas</Text>
                      <Text style={styles.bottlesTotalValue}>
                        {currencySymbol}{bottles.reduce((sum, b) => sum + ((b.price || 0) * (b.quantity || 1)), 0).toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.remainingCreditRow}>
                      <View style={styles.remainingCreditInfo}>
                        <Ionicons name="wallet-outline" size={16} color="rgb(251, 191, 36)" />
                        <Text style={styles.remainingCreditLabel}>Crédito Restante</Text>
                      </View>
                      <Text style={styles.remainingCreditValue}>
                        {currencySymbol}{(remainingCredit || 0).toFixed(0)}
                      </Text>
                    </View>
                    {remainingCredit > 0 ? (
                      <View style={styles.creditNote}>
                        <Text style={styles.creditNoteText}>
                          Este crédito está disponible para consumir en el evento
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.creditNote, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.creditNoteText, { color: 'rgb(52, 211, 153)' }]}>
                          Todo el presupuesto fue utilizado en botellas
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Bottles Pending Selection (completed but no bottles selected yet) */}
          {reservation.status === 'completed' && !reservation.bottles_selected_by_host && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="wine-outline" size={16} color="rgb(245, 158, 11)" />
                </View>
                <Text style={[styles.sectionLabel, { color: 'rgb(252, 211, 77)' }]}>Bottles</Text>
              </View>
              <View style={[styles.sectionCard, styles.pendingBottlesCard]}>
                <View style={styles.pendingBottlesContent}>
                  <Ionicons name="hourglass-outline" size={24} color="rgb(245, 158, 11)" />
                  <Text style={styles.pendingBottlesText}>Waiting for host to select bottles</Text>
                </View>

                {/* Bottle Selection URL for Staff */}
                {reservation.bottle_voucher_token && (
                  <View style={styles.bottleSelectionLinkSection}>
                    <View style={styles.bottleSelectionDivider} />
                    <Text style={styles.bottleSelectionLabel}>Selection Link for Host</Text>
                    <View style={styles.bottleSelectionUrlBox}>
                      <Text style={styles.bottleSelectionUrl} numberOfLines={1} ellipsizeMode="middle">
                        {`https://web.pullevents.com/es/vip/bottles/${reservation.bottle_voucher_token}`}
                      </Text>
                    </View>
                    <View style={styles.bottleSelectionActions}>
                      <TouchableOpacity
                        onPress={() => {
                          const url = `https://web.pullevents.com/es/vip/bottles/${reservation.bottle_voucher_token}`;
                          Share.share({ message: url });
                        }}
                        activeOpacity={0.7}
                        style={styles.bottleSelectionCopyBtn}
                      >
                        <Ionicons name="copy-outline" size={18} color="white" />
                        <Text style={styles.bottleSelectionBtnText}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const hostPhone = reservation.host_phone || '';
                          const hostPrefix = reservation.host_phone_prefix || '+502';
                          const url = `https://web.pullevents.com/es/vip/bottles/${reservation.bottle_voucher_token}`;
                          const hostFullName = `${reservation.host_name || ''} ${reservation.host_last_name || ''}`.trim() || 'Crack';
                          const eventName = getEventName();
                          const totalConsumables = reservation.total_consumables || reservation.stats?.total_consumables || 0;
                          const currency = reservation.currency || 'Q';

                          // Build super animated WhatsApp message
                          let message = `🍾✨ *¡${hostFullName}!* ✨🍾\n\n`;
                          message += `🎊🔥 *¡TU MOMENTO VIP HA LLEGADO!* 🔥🎊\n\n`;
                          message += `Tu reserva para *${eventName}* está LISTA y ahora viene lo mejor...\n\n`;

                          if (totalConsumables > 0) {
                            message += `💰 Tenés *${currency}${totalConsumables.toFixed(0)}* para elegir tus botellas favoritas 🥂\n\n`;
                          }

                          message += `👇 *ELEGÍ TUS BOTELLAS ACÁ* 👇\n${url}\n\n`;
                          message += `⏰ ¡No te tardes! Las mejores botellas vuelan rápido 🚀\n\n`;
                          message += `🎧🔥 *¡Nos vemos en la fiesta!* 🔥🎧`;

                          if (hostPhone) {
                            const cleanPhone = `${hostPrefix}${hostPhone}`.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
                            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                            Linking.openURL(whatsappUrl).catch(() => {
                              // If WhatsApp fails, share normally
                              Share.share({ message, title: '🍾 Link de Botellas VIP' });
                            });
                          } else {
                            // No phone, share message so they can send it manually
                            Share.share({ message, title: '🍾 Link de Botellas VIP' });
                          }
                        }}
                        activeOpacity={0.7}
                        style={styles.bottleSelectionWhatsappBtn}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="white" />
                        <Text style={styles.bottleSelectionBtnText}>Send to Host</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {/* Share Link - only show when not completed */}
            {reservation.status !== 'completed' && (
              <TouchableOpacity
                onPress={handleShareLink}
                activeOpacity={0.8}
                style={styles.actionButtonWrapper}
              >
                <BlurView intensity={80} tint="dark" style={styles.actionButtonBlur}>
                  <View style={styles.shareButtonInner}>
                    <Ionicons name="share-outline" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Share Link</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            {/* Close List (only if open) */}
            {canClose && (
              <TouchableOpacity
                onPress={() => setShowCloseModal(true)}
                activeOpacity={0.8}
                style={styles.actionButtonWrapper}
              >
                <BlurView intensity={80} tint="dark" style={styles.actionButtonBlur}>
                  <View style={styles.closeButtonInner}>
                    <Ionicons name="lock-closed" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Close List</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            {/* Finalize List (if closed, or completed without bottle token) */}
            {(reservation.status === 'closed' ||
              (reservation.status === 'completed' && !reservation.bottle_voucher_token && (reservation.stats?.paid_count || 0) > 0)) && (
              <TouchableOpacity
                onPress={() => setShowFinalizeModal(true)}
                activeOpacity={0.8}
                style={styles.actionButtonWrapper}
              >
                <BlurView intensity={80} tint="dark" style={styles.actionButtonBlur}>
                  <View style={styles.finalizeButtonInner}>
                    <Ionicons name="checkmark-done" size={18} color="white" />
                    <Text style={styles.actionButtonText}>
                      {reservation.status === 'completed' ? 'Generate Bottle Link' : 'Finalize'}
                    </Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Close List Modal */}
      <Modal visible={showCloseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Close VIP List</Text>
                <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                  <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Once closed, no more RSVPs will be accepted. All confirmed guests will be notified to pay.
              </Text>

              {/* Warning if not all guests confirmed */}
              {confirmedGuests.length < ((reservation.expected_men || 0) + (reservation.expected_women || 0)) && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={20} color="rgb(245, 158, 11)" />
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.warningTitle}>Not all guests confirmed</Text>
                    <Text style={styles.warningMessage}>
                      {confirmedGuests.length} of {(reservation.expected_men || 0) + (reservation.expected_women || 0)} expected guests have confirmed.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.deadlineField}>
                <Text style={styles.deadlineFieldLabel}>Payment deadline (hours)</Text>
                <TextInput
                  style={styles.deadlineInput}
                  value={deadlineHours}
                  onChangeText={setDeadlineHours}
                  keyboardType="number-pad"
                  placeholder="48"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                />
                <Text style={styles.deadlineHint}>
                  Guests will have {deadlineHours || '48'} hours to complete payment
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowCloseModal(false)}
                  activeOpacity={0.8}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCloseList}
                  disabled={isClosing}
                  activeOpacity={0.8}
                  style={[styles.modalConfirmBtn, isClosing && styles.modalBtnDisabled]}
                >
                  {isClosing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Close List</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Finalize List Modal */}
      <Modal visible={showFinalizeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Finalize VIP List</Text>
                <TouchableOpacity onPress={() => setShowFinalizeModal(false)}>
                  <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                This will end the payment period. Guests who haven't paid will be notified that they missed the deadline. The host will receive a link to select bottles.
              </Text>

              {/* Stats summary */}
              <View style={styles.finalizeStats}>
                <View style={styles.finalizeStatItem}>
                  <Ionicons name="checkmark-circle" size={20} color="rgb(16, 185, 129)" />
                  <Text style={styles.finalizeStatText}>
                    {paidGuests.length} paid
                  </Text>
                </View>
                <View style={styles.finalizeStatItem}>
                  <Ionicons name="time" size={20} color="rgb(245, 158, 11)" />
                  <Text style={styles.finalizeStatText}>
                    {confirmedGuests.length - paidGuests.length} pending
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowFinalizeModal(false)}
                  activeOpacity={0.8}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFinalizeList}
                  disabled={isFinalizing}
                  activeOpacity={0.8}
                  style={[styles.modalConfirmBtn, styles.modalFinalizeBtn, isFinalizing && styles.modalBtnDisabled]}
                >
                  {isFinalizing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Finalize</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '400',
    marginTop: 16,
  },
  errorText: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: 16,
    fontWeight: '400',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
  },
  typeBadgeText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  reservationTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    lineHeight: 20,
  },

  // Price Card
  priceCard: {
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 16,
  },
  priceHeader: {
    marginBottom: 12,
  },
  priceHeaderLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceHeaderNote: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
  priceGenderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceGenderItem: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  priceGenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  priceGenderLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  priceGenderValue: {
    color: 'rgb(16, 185, 129)',
    fontSize: 22,
    fontWeight: '800',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagGuests: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
  },
  tagTextPurple: {
    color: 'rgb(192, 132, 252)',
  },
  tagPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tagTextGreen: {
    color: 'rgb(52, 211, 153)',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  eventDateText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 6,
  },
  detailsList: {
    marginTop: 10,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },

  // Occupancy
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  occupancyItem: {
    alignItems: 'center',
  },
  occupancyNumber: {
    color: 'rgb(168, 85, 255)',
    fontSize: 32,
    fontWeight: '700',
  },
  occupancyExpected: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 32,
    fontWeight: '700',
  },
  occupancyLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  occupancyDivider: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 24,
    fontWeight: '300',
  },
  genderBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },

  // Deadline
  deadlineCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  deadlineText: {
    color: 'rgb(252, 211, 77)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Guests
  emptyGuests: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyGuestsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyGuestsSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
  },
  guestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  guestEmail: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
  },
  paidText: {
    color: 'rgb(16, 185, 129)',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
  },
  pendingText: {
    color: 'rgb(245, 158, 11)',
    fontSize: 11,
    fontWeight: '600',
  },
  whatsappButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgb(37, 211, 102)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(168, 85, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.5)',
    borderRadius: 12,
  },
  closeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
  },
  finalizeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBlur: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(15, 15, 21, 0.98)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    marginBottom: 20,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: 'rgb(252, 211, 77)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningMessage: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  deadlineField: {
    marginBottom: 24,
  },
  deadlineFieldLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  deadlineInput: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  deadlineHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: 'rgb(239, 68, 68)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottles Section
  bottleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bottleAvatar: {
    width: 36,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleImageWrapper: {
    width: 36,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
  },
  bottleImageActual: {
    width: '100%',
    height: '100%',
  },
  bottleName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottleBrand: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  bottleQuantity: {
    alignItems: 'flex-end',
  },
  bottleQtyText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 14,
    fontWeight: '700',
  },
  bottlePrice: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  bottlesTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  bottlesTotalLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  bottlesTotalValue: {
    color: 'rgb(168, 85, 255)',
    fontSize: 18,
    fontWeight: '700',
  },
  remainingCreditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 191, 36, 0.2)',
  },
  remainingCreditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remainingCreditLabel: {
    color: 'rgb(251, 191, 36)',
    fontSize: 14,
    fontWeight: '600',
  },
  remainingCreditValue: {
    color: 'rgb(251, 191, 36)',
    fontSize: 18,
    fontWeight: '700',
  },
  creditNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
  },
  creditNoteText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Pending Bottles
  pendingBottlesCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  pendingBottlesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  pendingBottlesText: {
    color: 'rgb(252, 211, 77)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Bottle Selection Link Section
  bottleSelectionLinkSection: {
    marginTop: 16,
    paddingTop: 16,
  },
  bottleSelectionDivider: {
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: 16,
  },
  bottleSelectionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  bottleSelectionUrlBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bottleSelectionUrl: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  bottleSelectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bottleSelectionCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(168, 85, 255, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
  },
  bottleSelectionWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgb(37, 211, 102)',
    borderRadius: 10,
  },
  bottleSelectionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Finalize Modal
  finalizeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  finalizeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalizeStatText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  modalFinalizeBtn: {
    backgroundColor: 'rgb(16, 185, 129)',
  },
});
