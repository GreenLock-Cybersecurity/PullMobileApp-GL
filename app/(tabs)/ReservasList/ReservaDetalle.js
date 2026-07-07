// app/(tabs)/ReservasList/ReservaDetalle.js - Professional Design
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { orderService } from '@/services/orderService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';

const { width } = Dimensions.get('window');
const HEADER_CONTENT_HEIGHT = 56;

export default function ReservaDetalle() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const scrollY = useRef(new Animated.Value(0)).current;

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
    return symbols[currency] || currency || 'Q';
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Order',
      'This will confirm the order and send tickets with QR codes to the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
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
                Alert.alert('Success', 'Order confirmed! Tickets sent to customer.', [
                  { text: 'OK', onPress: () => router.back() },
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
          { text: 'OK', onPress: () => router.back() },
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
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'checked_in': return '#3b82f6';
      case 'cancelled': return '#6b7280';
      case 'refunded': return '#8b5cf6';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      pending: 'Pending Approval',
      confirmed: 'Confirmed',
      checked_in: 'Checked In',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      expired: 'Expired',
    };
    return statusMap[status] || status;
  };

  if (isLoadingOrderDetail) {
    return (
      <BackgroundGlow>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
            <Text style={styles.loadingText}>Loading order details...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (orderDetailError || !currentOrder) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{orderDetailError || 'Order not found'}</Text>
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

  const order = currentOrder.order || currentOrder;
  const user_data = currentOrder.user || {};
  const event_data = currentOrder.event || {};
  const currency = order.currency || 'GTQ';
  const currencySymbol = getCurrencySymbol(currency);
  const canApprove = order.status === 'pending';
  const canReject = order.status === 'pending';

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
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20`, borderColor: `${getStatusColor(order.status)}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusDisplayName(order.status)}
              </Text>
            </View>
          </View>

          {/* Order Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.orderTitle}>
              {order.order_number || `Order #${order.id?.substring(0, 8)}`}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceAmount}>
                {currencySymbol}{order.total?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>

          {/* Info Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagTickets]}>
              <Ionicons name="ticket" size={14} color="rgb(168, 85, 255)" />
              <Text style={[styles.tagText, styles.tagTextTickets]}>
                {order.quantity || 1} {(order.quantity || 1) === 1 ? 'Ticket' : 'Tickets'}
              </Text>
            </View>
            <View style={[styles.tag, styles.tagDate]}>
              <Ionicons name="calendar" size={14} color="rgb(59, 130, 246)" />
              <Text style={[styles.tagText, styles.tagTextDate]}>
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Event Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(168, 85, 255, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={16} color="rgb(168, 85, 255)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(192, 132, 252)' }]}>Event</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{event_data.name || 'Event Name'}</Text>
              <Text style={styles.cardSubtitle}>
                {event_data.event_date
                  ? new Date(event_data.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Date not available'}
              </Text>
            </View>
          </View>

          {/* Customer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(110, 231, 183)' }]}>Customer</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>
                {user_data.name} {user_data.surname}
              </Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.detailText}>{user_data.email || 'No email'}</Text>
                </View>
                {user_data.phone && (
                  <View style={styles.detailItem}>
                    <Ionicons name="call-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                    <Text style={styles.detailText}>
                      {user_data.phone_prefix || ''} {user_data.phone}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Order Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={16} color="rgb(59, 130, 246)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(96, 165, 250)' }]}>Order Details</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
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
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              {order.reject_reason && (
                <View style={styles.rejectReasonBox}>
                  <View style={styles.rejectReasonHeader}>
                    <Ionicons name="alert-circle" size={16} color="rgb(239, 68, 68)" />
                    <Text style={styles.rejectReasonTitle}>Rejection Reason</Text>
                  </View>
                  <Text style={styles.rejectReasonText}>{order.reject_reason}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {(canApprove || canReject) && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                onPress={handleApprove}
                disabled={isApproving}
                activeOpacity={0.8}
                style={styles.actionButtonWrapper}
              >
                <BlurView intensity={80} tint="dark" style={styles.actionButtonBlur}>
                  <View style={styles.approveButtonInner}>
                    {isApproving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </>
                    )}
                  </View>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRejectModal(true)}
                disabled={isRejecting}
                activeOpacity={0.8}
                style={styles.actionButtonWrapper}
              >
                <BlurView intensity={80} tint="dark" style={styles.actionButtonBlur}>
                  <View style={styles.rejectButtonInner}>
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Reject Order</Text>
                  <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.5)" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Please provide a reason for rejecting this order. The customer will be notified.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter rejection reason..."
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
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
                    style={styles.modalCancelBtn}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleReject}
                    disabled={isRejecting || !rejectReason.trim()}
                    activeOpacity={0.8}
                    style={[styles.modalConfirmBtn, (!rejectReason.trim() || isRejecting) && styles.modalBtnDisabled]}
                  >
                    {isRejecting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Reject Order</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>
      </SafeAreaView>
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
    alignItems: 'flex-start',
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

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  orderTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
  },
  priceAmount: {
    color: 'rgb(16, 185, 129)',
    fontSize: 26,
    fontWeight: '700',
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
  tagTickets: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
  },
  tagTextTickets: {
    color: 'rgb(192, 132, 252)',
  },
  tagDate: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tagTextDate: {
    color: 'rgb(96, 165, 250)',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
  },
  infoValue: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  rejectReasonBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejectReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectReasonTitle: {
    color: 'rgb(239, 68, 68)',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectReasonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButtonWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  actionButtonBlur: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  approveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 10,
  },
  rejectButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 10,
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
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 16,
    color: 'white',
    fontSize: 15,
    minHeight: 120,
    marginBottom: 24,
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
});
