// app/(tabs)/EventosList/TicketsGestion.js - Ticket Types Management Screen
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import * as ticketTypeService from '@/services/ticketTypeService';

export default function TicketsGestion() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const eventId = params.id;

  const { user } = useAuthStore();
  const { currentEvent, fetchEventDetail } = useDataStore();

  // Check if this venue uses VIP List flow
  const useVipListFlow = user?.use_vip_list_flow || false;

  // Scroll tracking for navbar
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // State
  const [ticketTypes, setTicketTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState(null);

  // Form state
  const [ticketTypeForm, setTicketTypeForm] = useState({
    name: '',
    price: '',
    initialQuantity: '',
    benefits: '',
    expenses: '',
    isGroup: false,
    minQuantity: '',
    maxQuantity: '',
    hasGenderPricing: false,
    malePrice: '',
    femalePrice: '',
  });

  // Currency helper
  const getCurrencySymbol = (currency) => {
    const symbols = { GTQ: 'Q', USD: '$', EUR: '€', MXN: '$' };
    return symbols[currency] || currency || 'Q';
  };

  // Load data on mount
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load event details if not already loaded
      if (!currentEvent || currentEvent.id !== eventId) {
        await fetchEventDetail(eventId);
      }
      // Load ticket types
      const response = await ticketTypeService.getTicketTypesByEvent(eventId);
      const tickets = response.data || [];
      setTicketTypes(tickets);

      // VIP venues: auto-populate edit form if ticket exists
      if (useVipListFlow && tickets.length > 0) {
        const ticket = tickets[0];
        setEditingTicketType(ticket.id);
        setTicketTypeForm({
          name: ticket.name || '',
          price: (ticket.basePrice ?? ticket.base_price ?? ticket.price)?.toString() || '',
          initialQuantity: (ticket.initialQuantity ?? ticket.initial_quantity)?.toString() || '',
          benefits: ticket.benefits || '',
          expenses: (ticket.expenses)?.toString() || '',
          isGroup: ticket.isGroup ?? ticket.is_group ?? false,
          minQuantity: (ticket.minQuantity ?? ticket.min_quantity)?.toString() || '',
          maxQuantity: (ticket.maxQuantity ?? ticket.max_quantity)?.toString() || '',
          hasGenderPricing: ticket.hasGenderPricing ?? ticket.has_gender_pricing ?? false,
          malePrice: (ticket.malePrice ?? ticket.male_price)?.toString() || '',
          femalePrice: (ticket.femalePrice ?? ticket.female_price)?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setTicketTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTicketTypeForm({
      name: '',
      price: '',
      initialQuantity: '',
      benefits: '',
      expenses: '',
      isGroup: false,
      minQuantity: '',
      maxQuantity: '',
      hasGenderPricing: false,
      malePrice: '',
      femalePrice: '',
    });
    setEditingTicketType(null);
  };

  const handleEdit = (ticket) => {
    setEditingTicketType(ticket.id);
    setTicketTypeForm({
      name: ticket.name || '',
      price: (ticket.basePrice ?? ticket.base_price ?? ticket.price)?.toString() || '',
      initialQuantity: (ticket.initialQuantity ?? ticket.initial_quantity)?.toString() || '',
      benefits: ticket.benefits || '',
      expenses: (ticket.expenses)?.toString() || '',
      isGroup: ticket.isGroup ?? ticket.is_group ?? false,
      minQuantity: (ticket.minQuantity ?? ticket.min_quantity)?.toString() || '',
      maxQuantity: (ticket.maxQuantity ?? ticket.max_quantity)?.toString() || '',
      hasGenderPricing: ticket.hasGenderPricing ?? ticket.has_gender_pricing ?? false,
      malePrice: (ticket.malePrice ?? ticket.male_price)?.toString() || '',
      femalePrice: (ticket.femalePrice ?? ticket.female_price)?.toString() || '',
    });
  };

  const handleSave = async () => {
    // VIP List venues: simplified validation
    if (useVipListFlow) {
      if (!ticketTypeForm.malePrice || !ticketTypeForm.femalePrice) {
        Alert.alert('Error', 'Male price and female price are required');
        return;
      }
      if (!ticketTypeForm.minQuantity || !ticketTypeForm.maxQuantity) {
        Alert.alert('Error', 'Min and max people are required');
        return;
      }
    } else {
      // Regular validation
      if (!ticketTypeForm.name || !ticketTypeForm.price || !ticketTypeForm.initialQuantity) {
        Alert.alert('Error', 'Name, price and initial quantity are required');
        return;
      }
      if (ticketTypeForm.hasGenderPricing && (!ticketTypeForm.malePrice || !ticketTypeForm.femalePrice)) {
        Alert.alert('Error', 'Male and female prices are required for gender-based pricing');
        return;
      }
    }

    setIsSaving(true);
    try {
      // VIP List venues: force group and gender pricing settings
      const isGroup = useVipListFlow ? true : ticketTypeForm.isGroup;
      const hasGenderPricing = useVipListFlow ? true : ticketTypeForm.hasGenderPricing;
      const name = useVipListFlow ? 'VIP List Entry' : ticketTypeForm.name;
      const benefits = useVipListFlow ? 'Per Person Consumibles' : (ticketTypeForm.benefits || null);
      const price = useVipListFlow ? 0 : parseFloat(ticketTypeForm.price);

      // For VIP venues: auto-set quantity based on event capacity
      const ticketLimit = currentEvent?.ticket_limit || 0;
      const isUnlimited = !ticketLimit || ticketLimit === 0;
      const autoQuantity = useVipListFlow
        ? (isUnlimited ? 999999 : ticketLimit)
        : parseInt(ticketTypeForm.initialQuantity);

      const data = {
        name: name,
        price: price,
        initialQuantity: autoQuantity,
        benefits: benefits,
        expenses: ticketTypeForm.expenses ? parseFloat(ticketTypeForm.expenses) : null,
        isGroup: isGroup,
        minQuantity: ticketTypeForm.minQuantity ? parseInt(ticketTypeForm.minQuantity) : null,
        maxQuantity: ticketTypeForm.maxQuantity ? parseInt(ticketTypeForm.maxQuantity) : null,
        hasGenderPricing: hasGenderPricing,
        malePrice: ticketTypeForm.malePrice ? parseFloat(ticketTypeForm.malePrice) : null,
        femalePrice: ticketTypeForm.femalePrice ? parseFloat(ticketTypeForm.femalePrice) : null,
      };

      if (editingTicketType) {
        // Optimistic update
        setTicketTypes(prev => prev.map(t =>
          t.id === editingTicketType ? { ...t, ...data } : t
        ));
        await ticketTypeService.updateTicketType(editingTicketType, data);
        Alert.alert('Success', 'Ticket type updated');
      } else {
        await ticketTypeService.createTicketType(eventId, data);
        Alert.alert('Success', 'Ticket type created');
      }

      resetForm();
      // Reload to get server data
      const response = await ticketTypeService.getTicketTypesByEvent(eventId);
      setTicketTypes(response.data || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save ticket type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (ticketId, ticketName) => {
    Alert.alert(
      'Delete Ticket Type',
      `Are you sure you want to delete "${ticketName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const previousTicketTypes = ticketTypes;
            setTicketTypes(prev => prev.filter(t => t.id !== ticketId));

            try {
              await ticketTypeService.deleteTicketType(ticketId);
              Alert.alert('Success', 'Ticket type deleted');
            } catch (error) {
              setTicketTypes(previousTicketTypes);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete ticket type');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  return (
    <BackgroundGlow>
      <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="ticket" size={28} color="rgb(168, 85, 255)" />
            </View>
            <Text style={styles.headerTitle}>
              {useVipListFlow ? 'VIP Pricing' : 'Ticket Types'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentEvent?.event_name || 'Manage event tickets'}
            </Text>
          </View>

          {/* Existing Ticket Types List */}
          {ticketTypes.length > 0 && (
            <View style={styles.ticketTypesList}>
              <Text style={styles.sectionTitle}>Current Tickets</Text>
              {ticketTypes.map((ticket) => {
                const currencySymbol = getCurrencySymbol(ticket.currency || currentEvent?.currency);
                return (
                  <BlurView key={ticket.id} intensity={40} tint="dark" style={styles.ticketTypeItemBlur}>
                    <View style={styles.ticketTypeItem}>
                      <View style={styles.ticketTypeInfo}>
                        <Text style={styles.ticketTypeName}>{ticket.name}</Text>
                        <View style={styles.ticketTypePriceRow}>
                          {(ticket.hasGenderPricing || ticket.has_gender_pricing) ? (
                            <>
                              <View style={styles.genderPriceTag}>
                                <Ionicons name="male" size={12} color="rgb(59, 130, 246)" />
                                <Text style={styles.genderPriceText}>{currencySymbol}{(ticket.malePrice ?? ticket.male_price)?.toFixed(2)}</Text>
                              </View>
                              <View style={[styles.genderPriceTag, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                                <Ionicons name="female" size={12} color="rgb(236, 72, 153)" />
                                <Text style={[styles.genderPriceText, { color: 'rgb(236, 72, 153)' }]}>{currencySymbol}{(ticket.femalePrice ?? ticket.female_price)?.toFixed(2)}</Text>
                              </View>
                            </>
                          ) : (
                            <Text style={styles.ticketTypePricePurple}>
                              {currencySymbol}{ticket.price?.toFixed(2)}
                            </Text>
                          )}
                          <Text style={styles.ticketTypeQtyText}>
                            {ticket.availableQuantity ?? ticket.available_quantity ?? 0}/{ticket.initialQuantity ?? ticket.initial_quantity ?? 0} available
                          </Text>
                        </View>
                        {(ticket.isGroup || ticket.is_group) && (
                          <View style={styles.ticketTypeBadge}>
                            <Text style={styles.ticketTypeBadgeText}>
                              Group: {ticket.minQuantity ?? ticket.min_quantity}-{ticket.maxQuantity ?? ticket.max_quantity} people
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.ticketTypeActions}>
                        <TouchableOpacity onPress={() => handleEdit(ticket)} activeOpacity={0.7}>
                          <BlurView intensity={60} tint="dark" style={styles.ticketTypeActionBtnBlur}>
                            <View style={styles.ticketTypeActionBtnInner}>
                              <Ionicons name="pencil" size={16} color="rgba(139, 92, 246, 0.9)" />
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                        {!useVipListFlow && (
                          <TouchableOpacity onPress={() => handleDelete(ticket.id, ticket.name)} activeOpacity={0.7}>
                            <BlurView intensity={60} tint="dark" style={styles.ticketTypeActionBtnBlur}>
                              <View style={[styles.ticketTypeActionBtnInner, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                                <Ionicons name="trash" size={16} color="rgba(239, 68, 68, 0.9)" />
                              </View>
                            </BlurView>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </BlurView>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {ticketTypes.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="ticket-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyStateText}>
                {useVipListFlow ? 'No VIP pricing set yet' : 'No ticket types yet'}
              </Text>
            </View>
          )}

          {/* Ticket Type Form - Always visible, auto-populated for VIP venues */}
          <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {useVipListFlow
                  ? (editingTicketType ? 'Edit VIP Entry Pricing' : 'VIP Entry Pricing')
                  : (editingTicketType ? 'Edit Ticket Type' : 'Add New Ticket Type')}
              </Text>

              {/* VIP List Info Banner */}
              {useVipListFlow && (
                <View style={styles.vipInfoBanner}>
                  <Ionicons name="information-circle" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.vipInfoText}>VIP List venues use gender-based pricing</Text>
                </View>
              )}

              {/* Name Field - Only for regular venues */}
              {!useVipListFlow && (
                <View style={styles.field}>
                  <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="ticket-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={ticketTypeForm.name}
                      onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, name: text })}
                      placeholder="e.g., General Admission, VIP"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    />
                  </View>
                </View>
              )}

              {/* Price and Quantity Row - Different for VIP venues */}
              {!useVipListFlow && (
                <View style={styles.rowFields}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Price <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="cash-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.price}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, price: text })}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="layers-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.initialQuantity}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, initialQuantity: text })}
                        placeholder="100"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* VIP Venues: Min/Max People */}
              {useVipListFlow && (
                <View style={styles.rowFields}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Min People <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.minQuantity}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, minQuantity: text })}
                        placeholder="1"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Max People <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="add-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.maxQuantity}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, maxQuantity: text })}
                        placeholder="20"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* VIP Venues: Gender Prices */}
              {useVipListFlow && (
                <View style={styles.rowFields}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>
                      <Ionicons name="male" size={14} color="rgb(59, 130, 246)" /> Male Price <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="male-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.malePrice}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, malePrice: text })}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>
                      <Ionicons name="female" size={14} color="rgb(236, 72, 153)" /> Female Price <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="female-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.femalePrice}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, femalePrice: text })}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Benefits Field - Only for regular venues */}
              {!useVipListFlow && (
                <View style={styles.field}>
                  <Text style={styles.label}>Benefits <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.inputSimple, styles.textArea]}
                    value={ticketTypeForm.benefits}
                    onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, benefits: text })}
                    placeholder="e.g., Free drink, Priority entry..."
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Internal Expenses Field - Only for regular venues */}
              {!useVipListFlow && (
                <View style={styles.field}>
                  <Text style={styles.label}>Internal Expenses</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="wallet-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={ticketTypeForm.expenses}
                      onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, expenses: text })}
                      placeholder="Cost tracking (not shown to users)"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              )}

              {/* Group Ticket Toggle - Only for regular venues */}
              {!useVipListFlow && (
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.label}>Group Ticket</Text>
                    <Text style={styles.labelSubtext}>For groups (e.g., tables, VIP sections)</Text>
                  </View>
                  <Switch
                    value={ticketTypeForm.isGroup}
                    onValueChange={(value) => setTicketTypeForm({ ...ticketTypeForm, isGroup: value, hasGenderPricing: false })}
                    trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(168, 85, 255, 0.5)' }}
                    thumbColor={ticketTypeForm.isGroup ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.8)'}
                  />
                </View>
              )}

              {/* Regular venues: Group options */}
              {!useVipListFlow && ticketTypeForm.isGroup && (
                <>
                  <View style={styles.rowFields}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Min People <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.minQuantity}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, minQuantity: text })}
                          placeholder="1"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Max People <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="add-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.maxQuantity}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, maxQuantity: text })}
                          placeholder="10"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Gender Pricing Toggle */}
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.label}>Gender-Based Pricing</Text>
                      <Text style={styles.labelSubtext}>Different prices for male/female</Text>
                    </View>
                    <Switch
                      value={ticketTypeForm.hasGenderPricing}
                      onValueChange={(value) => setTicketTypeForm({ ...ticketTypeForm, hasGenderPricing: value })}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(168, 85, 255, 0.5)' }}
                      thumbColor={ticketTypeForm.hasGenderPricing ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.8)'}
                    />
                  </View>

                  {ticketTypeForm.hasGenderPricing && (
                    <View style={styles.rowFields}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Male Price <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="male-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={ticketTypeForm.malePrice}
                            onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, malePrice: text })}
                            placeholder="0.00"
                            placeholderTextColor="rgba(255, 255, 255, 0.35)"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Female Price <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="female-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={ticketTypeForm.femalePrice}
                            onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, femalePrice: text })}
                            placeholder="0.00"
                            placeholderTextColor="rgba(255, 255, 255, 0.35)"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Action Buttons - Cancel (left, goes back) and Save (right) */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.cancelButton}>
                  <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                    <View style={styles.cancelButtonInner}>
                      <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                  style={styles.submitButton}
                >
                  <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                    <View style={styles.submitButtonInner}>
                      {isSaving ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={18} color="white" />
                          <Text style={styles.submitButtonText}>Save</Text>
                        </>
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 12,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.7)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },

  // Section
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Ticket Types List
  ticketTypesList: {
    marginBottom: 24,
  },
  ticketTypeItemBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ticketTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
  },
  ticketTypeInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketTypeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketTypePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  ticketTypePricePurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
  ticketTypeQtyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  genderPriceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genderPriceText: {
    color: 'rgb(59, 130, 246)',
    fontSize: 13,
    fontWeight: '500',
  },
  ticketTypeBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketTypeBadgeText: {
    color: 'rgba(168, 85, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  ticketTypeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ticketTypeActionBtnBlur: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  ticketTypeActionBtnInner: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 12,
  },

  // VIP Banner
  vipPricingSetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 12,
    marginBottom: 24,
  },
  vipPricingSetTitle: {
    color: 'rgb(52, 211, 153)',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  vipPricingSetText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  vipInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 16,
  },
  vipInfoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    flex: 1,
  },

  // Form
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  required: {
    color: 'rgb(239, 68, 68)',
    fontWeight: '600',
  },
  labelSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 48,
    paddingLeft: 44,
    paddingRight: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  inputSimple: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 16,
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
