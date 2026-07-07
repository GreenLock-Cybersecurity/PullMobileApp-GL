// app/(tabs)/ReservasList/GuestListDetalle.js - Professional Design
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
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { guestListService } from '@/services/guestListService';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';

const HEADER_CONTENT_HEIGHT = 56;

export default function GuestListDetalle() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [signup, setSignup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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
      fetchSignupDetail();
    }
  }, [id]);

  const fetchSignupDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to get from pending signups first
      if (user?.venue_id_real) {
        const result = await guestListService.getPendingSignups(user.venue_id_real);

        if (result.success) {
          const found = result.data.find(s => s.id === id);
          if (found) {
            setSignup(found);
            setIsLoading(false);
            return;
          }
        }
      }

      // If not found in pending, try direct fetch
      const result = await guestListService.getSignupDetails(id);
      if (result.success) {
        setSignup(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load signup details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Signup',
      'Generate ticket and notify the guest?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setIsApproving(true);
            try {
              const result = await guestListService.approveSignup(id);

              if (result.success) {
                Alert.alert('Success', 'Signup approved! Ticket sent to guest.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve signup');
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
      const result = await guestListService.rejectSignup(id, rejectReason);

      if (result.success) {
        setShowRejectModal(false);
        Alert.alert('Success', 'Signup rejected successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject signup');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const getGenderDisplay = (gender) => {
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      default: return gender;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <BackgroundGlow>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
            <Text style={styles.loadingText}>Loading signup...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (error || !signup) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{error || 'Signup not found'}</Text>
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

  const canApprove = signup.status === 'pending';
  const canReject = signup.status === 'pending';
  const totalPeople = 1 + (signup.guest_count || 0);

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
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(signup.status)}20`, borderColor: `${getStatusColor(signup.status)}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(signup.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(signup.status) }]}>
                {getStatusDisplayName(signup.status)}
              </Text>
            </View>
          </View>

          {/* Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.orderTitle}>Guest List Signup</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceAmountFree}>FREE</Text>
            </View>
          </View>

          {/* Info Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagPeople]}>
              <Ionicons name="people" size={14} color="rgb(168, 85, 255)" />
              <Text style={[styles.tagText, styles.tagTextPeople]}>
                {totalPeople} {totalPeople === 1 ? 'Person' : 'People'}
              </Text>
            </View>
            <View style={[styles.tag, styles.tagGender]}>
              <Ionicons
                name={signup.gender === 'male' ? 'male' : 'female'}
                size={14}
                color={signup.gender === 'male' ? 'rgb(96, 165, 250)' : 'rgb(244, 114, 182)'}
              />
              <Text style={[styles.tagText, { color: signup.gender === 'male' ? 'rgb(96, 165, 250)' : 'rgb(244, 114, 182)' }]}>
                {getGenderDisplay(signup.gender)}
              </Text>
            </View>
            <View style={[styles.tag, styles.tagDate]}>
              <Ionicons name="calendar" size={14} color="rgb(59, 130, 246)" />
              <Text style={[styles.tagText, styles.tagTextDate]}>
                {signup.created_at
                  ? new Date(signup.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Guest List Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(168, 85, 255, 0.1)' }]}>
                <Ionicons name="list-outline" size={16} color="rgb(168, 85, 255)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(192, 132, 252)' }]}>Guest List</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{signup.guest_list_name || 'Guest List'}</Text>
              <Text style={styles.cardSubtitle}>{signup.event_name || 'Event'}</Text>
              {signup.event_date && (
                <View style={[styles.detailItem, { marginTop: 8 }]}>
                  <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.detailText}>{formatDate(signup.event_date)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Responsible Person Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(110, 231, 183)' }]}>Responsible Person</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{signup.name} {signup.last_name}</Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.detailText}>{signup.email}</Text>
                </View>
                {signup.phone && (
                  <View style={styles.detailItem}>
                    <Ionicons name="call-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                    <Text style={styles.detailText}>
                      {signup.phone_prefix || '+502'} {signup.phone}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Summary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                <Ionicons name="receipt-outline" size={16} color="rgb(251, 191, 36)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(252, 211, 77)' }]}>Summary</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Responsible</Text>
                <Text style={styles.infoValue}>1</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Companions</Text>
                <Text style={styles.infoValue}>+{signup.guest_count || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total People</Text>
                <Text style={styles.infoValuePurple}>{totalPeople}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoValueGreen}>FREE</Text>
              </View>
            </View>
          </View>

          {/* Verification Code Section */}
          {signup.verification_code && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Ionicons name="key-outline" size={16} color="rgb(139, 92, 246)" />
                </View>
                <Text style={[styles.sectionLabel, { color: 'rgb(167, 139, 250)' }]}>Verification Code</Text>
              </View>
              <View style={styles.sectionCard}>
                <Text style={styles.verificationCode}>{signup.verification_code}</Text>
              </View>
            </View>
          )}

          {/* Registered Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="time-outline" size={16} color="rgb(59, 130, 246)" />
              </View>
              <Text style={[styles.sectionLabel, { color: 'rgb(96, 165, 250)' }]}>Registered</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.detailText}>{formatDate(signup.created_at)}</Text>
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
      </SafeAreaView>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reject Signup</Text>
                <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                  <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Please provide a reason for rejecting this signup.
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
                    <Text style={styles.modalConfirmText}>Reject</Text>
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
  priceAmountFree: {
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
  tagPeople: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
  },
  tagTextPeople: {
    color: 'rgb(192, 132, 252)',
  },
  tagGender: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
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
  infoValueGreen: {
    color: 'rgb(16, 185, 129)',
    fontSize: 13,
    fontWeight: '600',
  },
  infoValuePurple: {
    color: 'rgb(167, 139, 250)',
    fontSize: 15,
    fontWeight: '700',
  },

  // Verification Code
  verificationCode: {
    color: 'rgb(167, 139, 250)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
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
