// app/(tabs)/ReservasList/ReservaDetalle.js - COMPLETO CORREGIDO
import { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ImageBackground,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { orderService } from '@/services/orderService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 640;
const HEADER_CONTENT_HEIGHT = 56;

export default function ReservaDetalle() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);

  // Hide tab bar when this screen is focused
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

  const {
    currentOrder,
    isLoadingOrderDetail,
    orderDetailError,
    fetchOrderDetail,
    clearCurrentOrder,
  } = useDataStore();

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchOrderDetail(id);
    }

    return () => {
      clearCurrentOrder();
    };
  }, [id]);

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GTQ': 'Q',
      'MXN': '$',
      'GBP': '£',
    };
    return symbols[currency] || currency || '€';
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Order',
      'Send payment link to customer?',
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
              const result = await orderService.approveOrder(
                id,
                user.venue_id_real,
                user.organization_id_real,
                user.employee_id_real
              );

              if (result.success) {
                Alert.alert('Success', 'Order confirmed! Tickets with QR codes sent to customer.', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve order');
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
      const result = await orderService.rejectOrder(
        id,
        user.venue_id_real,
        user.organization_id_real,
        user.employee_id_real,
        rejectReason
      );

      if (result.success) {
        setShowRejectModal(false);
        Alert.alert('Success', 'Order rejected successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject order');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'; // Amber/Orange - awaiting approval
      case 'confirmed':
        return '#10b981'; // Green - approved, has QR
      case 'checked_in':
        return '#3b82f6'; // Blue - entered venue
      case 'cancelled':
        return '#6b7280'; // Gray - cancelled
      case 'refunded':
        return '#8b5cf6'; // Purple - refunded
      case 'expired':
        return '#ef4444'; // Red - expired/no-show
      default:
        return '#6b7280';
    }
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      checked_in: 'Checked-In',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      expired: 'Expired',
    };
    return statusMap[status] || status;
  };

  if (isLoadingOrderDetail) {
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
            <Text style={styles.loadingText}>Loading order details...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (orderDetailError || !currentOrder) {
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
            <Text style={styles.errorText}>
              {orderDetailError || 'Order not found'}
            </Text>
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

  const order = currentOrder.order || currentOrder;
  const user_data = currentOrder.user || {};
  const event_data = currentOrder.event || {};
  // Get currency from the order object (stored per order from venue settings)
  const currency = order.currency || 'GTQ';
  const currencySymbol = getCurrencySymbol(currency);

  const canApprove = order.status === 'pending';
  const canReject = order.status === 'pending';

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <CustomHeader showBackButton />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={[styles.scrollView, { paddingTop: HEADER_CONTENT_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.statusContainer}>
              <BlurView intensity={60} tint="dark" style={styles.statusBadge}>
                <LinearGradient
                  colors={[`${getStatusColor(order.status)}40`, `${getStatusColor(order.status)}20`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                  {getStatusDisplayName(order.status)}
                </Text>
              </BlurView>
              <View style={styles.orderIdContainer}>
                <Ionicons name="ticket-outline" size={16} color="rgba(167, 139, 250, 0.9)" />
                <Text style={styles.orderIdText}>
                  {order.order_number || `#${order.id.substring(0, 8)}`}
                </Text>
              </View>
            </View>

            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>EVENT</Text>
                <Text style={styles.eventName}>{event_data.name || 'Event Name'}</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="rgb(167, 139, 250)" />
                  <Text style={styles.detailText}>
                    {event_data.event_date
                      ? new Date(event_data.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Date not available'}
                  </Text>
                </View>
              </View>
            </BlurView>

            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(52, 211, 153, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>CUSTOMER</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color="rgb(52, 211, 153)" />
                  <Text style={styles.customerName}>
                    {user_data.name} {user_data.surname}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.detailText}>{user_data.email}</Text>
                </View>
                {user_data.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                    <Text style={styles.detailText}>
                      {user_data.phone_prefix || ''} {user_data.phone}
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>

            {/* CARD DE TOTAL - TAMAÑO NORMAL COMO CUSTOMER */}
            <BlurView intensity={60} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(34, 211, 238, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>ORDER TOTAL</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.totalAmount}>
                    {currencySymbol}{order.total?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            </BlurView>

            <BlurView intensity={60} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <Text style={styles.sectionLabel}>ORDER DETAILS</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Created</Text>
                  <Text style={styles.infoValue}>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </Text>
                </View>
                {order.approved_at && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Approved</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.approved_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
                {order.reject_reason && (
                  <View style={styles.rejectReasonContainer}>
                    <Text style={styles.rejectReasonLabel}>Rejection Reason:</Text>
                    <Text style={styles.rejectReasonText}>{order.reject_reason}</Text>
                  </View>
                )}
              </View>
            </BlurView>

            {(canApprove || canReject) && (
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

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.modalContent}>
              <View style={styles.modalInner}>
                <Text style={styles.modalTitle}>Reject Order</Text>
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
  container: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderIdText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '300',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    padding: 16,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 12,
  },
  eventName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    flex: 1,
  },
  customerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  totalAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '300',
  },
  infoValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  rejectReasonContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectReasonLabel: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  rejectReasonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
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