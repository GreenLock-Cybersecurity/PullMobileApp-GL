// app/(tabs)/ReservasList/GroupReservaDetalle.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ImageBackground,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { groupReservationService } from '@/services/groupReservationService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';

// Header content height (without safe area inset)
const HEADER_CONTENT_HEIGHT = 56;

export default function GroupReservaDetalle() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);

  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchReservationDetail();
    }
  }, [id]);

  const fetchReservationDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await groupReservationService.getReservationDetails(id);

      if (result.success) {
        setReservation(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load reservation details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Reservation',
      'Generate tickets for paid guests and notify organizer?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            setIsApproving(true);
            try {
              const result = await groupReservationService.approveReservation(id);

              if (result.success) {
                Alert.alert('Success', 'Reservation approved! Tickets sent to paid guests.', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve reservation');
            } finally {
              setIsApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setIsRejecting(true);
    try {
      const result = await groupReservationService.rejectReservation(id, rejectReason);

      if (result.success) {
        setShowRejectModal(false);
        Alert.alert('Success', 'Reservation rejected successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject reservation');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={15}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
            <Text style={styles.loadingText}>Loading reservation...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (error || !reservation) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={15}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{error || 'Reservation not found'}</Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ marginTop: 16 }}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const canApprove = reservation.status_name === 'pending';
  const canReject = reservation.status_name === 'pending';
  const paidGuests = reservation.guests?.filter(g => g.paid_at) || [];

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />

      {/* Custom Header */}
      <CustomHeader showBackButton />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={[styles.scrollView, { paddingTop: HEADER_CONTENT_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Status Row - Status left, Order ID right */}
            <View style={styles.statusContainer}>
              <BlurView intensity={60} tint="dark" style={styles.statusBadge}>
                <LinearGradient
                  colors={[
                    `${getStatusColor(reservation.status_name)}40`,
                    `${getStatusColor(reservation.status_name)}20`,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statusText, { color: getStatusColor(reservation.status_name) }]}>
                  {reservation.status_name?.charAt(0).toUpperCase() + reservation.status_name?.slice(1)}
                </Text>
              </BlurView>

              <BlurView intensity={60} tint="dark" style={styles.orderIdBadge}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.15)', 'rgba(217, 70, 239, 0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="receipt-outline" size={14} color="rgba(167, 139, 250, 0.9)" />
                <Text style={styles.orderIdText}>#{reservation.id?.slice(-8).toUpperCase()}</Text>
              </BlurView>
            </View>

            {/* Event Info */}
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>EVENT</Text>
                <Text style={styles.eventName}>{reservation.event_name || 'Event Name'}</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="rgb(167, 139, 250)" />
                  <Text style={styles.detailText}>{reservation.venue_name || 'Venue'}</Text>
                </View>
              </View>
            </BlurView>

            {/* Organizer Info */}
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(52, 211, 153, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>ORGANIZER</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color="rgb(52, 211, 153)" />
                  <Text style={styles.customerName}>{reservation.organizer_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color="rgb(103, 232, 249)" />
                  <Text style={styles.detailText}>{reservation.organizer_email}</Text>
                </View>
              </View>
            </BlurView>

            {/* Reservation Summary */}
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>RESERVATION SUMMARY</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Guests</Text>
                  <Text style={styles.summaryValue}>{reservation.guest_count}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid Guests</Text>
                  <Text style={styles.summaryValue}>{paidGuests.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount</Text>
                  <Text style={styles.summaryValue}>Q{reservation.total_amount?.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid Amount</Text>
                  <Text style={styles.summaryValuePaid}>Q{((reservation.total_amount || 0) - (reservation.pending_amount || 0)).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pending Amount</Text>
                  <Text style={styles.summaryValuePending}>Q{reservation.pending_amount?.toFixed(2)}</Text>
                </View>
              </View>
            </BlurView>

            {/* Guest List */}
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>GUESTS ({reservation.guests?.length || 0})</Text>
                {reservation.guests?.map((guest, index) => (
                  <View key={guest.id} style={styles.guestItem}>
                    <View style={styles.guestInfo}>
                      {guest.paid_at ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      ) : (
                        <Ionicons name="time-outline" size={20} color="#f59e0b" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guestName}>
                          {guest.name} {guest.last_name}
                          {index === 0 && <Text style={styles.organizerTag}> (Organizer)</Text>}
                        </Text>
                        {guest.email && <Text style={styles.guestEmail}>{guest.email}</Text>}
                      </View>
                    </View>
                    {guest.paid_at ? (
                      <Text style={styles.guestPaid}>Paid</Text>
                    ) : (
                      <Text style={styles.guestPending}>Q{guest.amount_due?.toFixed(2)}</Text>
                    )}
                  </View>
                ))}
              </View>
            </BlurView>

            {/* Bottles */}
            {reservation.bottles && reservation.bottles.length > 0 && (
              <BlurView intensity={60} tint="dark" style={styles.card}>
                <View style={styles.cardInner}>
                  <Text style={styles.sectionLabel}>BOTTLES</Text>
                  {reservation.bottles.map((bottle, index) => (
                    <View key={index} style={styles.bottleItem}>
                      <Text style={styles.bottleQuantity}>{bottle.quantity}x</Text>
                      <Text style={styles.bottleName}>{bottle.bottle_name}</Text>
                      <Text style={styles.bottlePrice}>Q{(bottle.price * bottle.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            )}

            {/* Special Requests */}
            {reservation.special_requests && (
              <BlurView intensity={60} tint="dark" style={styles.card}>
                <View style={styles.cardInner}>
                  <Text style={styles.sectionLabel}>SPECIAL REQUESTS</Text>
                  <Text style={styles.specialRequests}>{reservation.special_requests}</Text>
                </View>
              </BlurView>
            )}

            {/* Action Buttons */}
            {canApprove && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={isApproving}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.3)', 'rgba(5, 150, 105, 0.3)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.approveButton}
                  >
                    {isApproving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                        <Text style={styles.buttonText}>Approve</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowRejectModal(true)}
                  disabled={isRejecting}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.3)', 'rgba(220, 38, 38, 0.3)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rejectButton}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Reject</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalContent}>
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>Reject Reservation</Text>
              <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Reason for rejection..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  <View style={styles.modalCancelButton}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.9)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.modalConfirmButton, (!rejectReason.trim() || isRejecting) && styles.modalButtonDisabled]}
                  >
                    {isRejecting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Reject</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
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
  container: {
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  orderIdBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderIdText: {
    color: 'rgba(167, 139, 250, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  eventName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  customerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
  },
  summaryValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValuePaid: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValuePending: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  guestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guestName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  organizerTag: {
    color: '#a78bfa',
    fontSize: 12,
  },
  guestEmail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  guestPaid: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  guestPending: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  bottleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  bottleQuantity: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
  },
  bottleName: {
    flex: 1,
    color: 'white',
    fontSize: 14,
  },
  bottlePrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  specialRequests: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  gradientButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.95)',
    padding: 24,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  modalConfirmButton: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
