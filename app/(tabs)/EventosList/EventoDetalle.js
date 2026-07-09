// app/(tabs)/EventosList/EventoDetalle.js - COMPLETO CORREGIDO
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import * as ticketTypeService from '@/services/ticketTypeService';
import { guestListService } from '@/services/guestListService';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '@/services/uploadService';

// Header content height (without safe area inset)
const HEADER_CONTENT_HEIGHT = 56;

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

export default function EventoDetalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const useVipListFlow = user?.use_vip_list_flow || false;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Dynamic header height based on device safe area
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

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
    currentEvent,
    isLoadingEventDetail,
    eventDetailError,
    fetchEventDetail,
    clearCurrentEvent,
    updateEvent,
    isUpdatingEvent,
    deleteEvent,
    isDeletingEvent,
  } = useDataStore();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    image: '',
    event_date: '',
    start_time: '',
    end_time: '',
    ticket_limit: '',
    isUnlimited: true, // Default to unlimited capacity
    dress_code: '',
    min_age: '',
    custom_location: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Temp values for iOS pickers
  const [tempDate, setTempDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  // Image picker state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Ticket types state
  const [isTicketTypesModalVisible, setIsTicketTypesModalVisible] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [isLoadingTicketTypes, setIsLoadingTicketTypes] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState(null);
  const ticketTypesLoadedAt = useRef(0); // Cache timestamp for ticket types
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
  const [isSavingTicketType, setIsSavingTicketType] = useState(false);

  // Guest list types state
  const [isGuestListModalVisible, setIsGuestListModalVisible] = useState(false);
  const [guestListTypes, setGuestListTypes] = useState([]);
  const [isLoadingGuestLists, setIsLoadingGuestLists] = useState(false);
  const [editingGuestListType, setEditingGuestListType] = useState(null);
  const guestListTypesLoadedAt = useRef(0); // Cache timestamp for guest list types

  // Cache duration: 5 minutes (300000ms) - data is considered fresh within this window
  const CACHE_DURATION = 300000;
  const [guestListForm, setGuestListForm] = useState({
    name: '',
    description: '',
    maxCapacity: '',
    allowedGender: '',
    isActive: true,
  });
  const [isSavingGuestList, setIsSavingGuestList] = useState(false);

  // Currency helper function
  const getCurrencySymbol = (currency) => {
    const symbols = {
      'GTQ': 'Q',
      'USD': '$',
      'EUR': '€',
      'MXN': '$',
    };
    return symbols[currency] || currency || 'Q';
  };

  useEffect(() => {
    if (id) {
      fetchEventDetail(id);
      // Load ticket types and guest lists immediately
      loadTicketTypesData();
      loadGuestListTypesData();
    }
    return () => {
      clearCurrentEvent();
    };
  }, [id, fetchEventDetail, clearCurrentEvent]);

  // Load ticket types data (used on initial load and refresh)
  // forceReload: true bypasses cache, false uses cached data if fresh
  const loadTicketTypesData = async (forceReload = false) => {
    if (!id) return;

    // Skip if data is fresh (loaded within cache duration) and not forcing reload
    const now = Date.now();
    if (!forceReload && ticketTypesLoadedAt.current && (now - ticketTypesLoadedAt.current < CACHE_DURATION)) {
      return; // Data is still fresh, skip reload
    }

    setIsLoadingTicketTypes(true);
    try {
      const response = await ticketTypeService.getTicketTypesByEvent(id);
      setTicketTypes(response.data || []);
      ticketTypesLoadedAt.current = now; // Update cache timestamp
    } catch {
      setTicketTypes([]);
    } finally {
      setIsLoadingTicketTypes(false);
    }
  };

  // Load guest list types data (used on initial load and refresh)
  // forceReload: true bypasses cache, false uses cached data if fresh
  const loadGuestListTypesData = async (forceReload = false) => {
    if (!id) return;

    // Skip if data is fresh (loaded within cache duration) and not forcing reload
    const now = Date.now();
    if (!forceReload && guestListTypesLoadedAt.current && (now - guestListTypesLoadedAt.current < CACHE_DURATION)) {
      return; // Data is still fresh, skip reload
    }

    setIsLoadingGuestLists(true);
    try {
      const response = await guestListService.getGuestListTypes(id);
      setGuestListTypes(response.data || []);
      guestListTypesLoadedAt.current = now; // Update cache timestamp
    } catch {
      setGuestListTypes([]);
    } finally {
      setIsLoadingGuestLists(false);
    }
  };

  useEffect(() => {
    if (currentEvent && isEditModalVisible) {
      // ticket_limit = 0 or null means unlimited
      const ticketLimit = currentEvent.ticket_limit;
      const isUnlimited = !ticketLimit || ticketLimit === 0;
      setEditForm({
        name: currentEvent.event_name || '',
        description: currentEvent.description || '',
        image: currentEvent.event_img || '',
        event_date: currentEvent.event_date || '',
        start_time: currentEvent.start_time || '',
        end_time: currentEvent.end_time || '',
        ticket_limit: isUnlimited ? '' : ticketLimit.toString(),
        isUnlimited: isUnlimited,
        dress_code: currentEvent.dress_code || '',
        min_age: currentEvent.min_age?.toString() || '18',
        custom_location: currentEvent.custom_location || '',
      });
    }
  }, [currentEvent, isEditModalVisible]);

  // OPTIMIZED: Removed unnecessary reloads when modals open
  // Data is already loaded on initial page load and cached for 5 minutes
  // Only force reload after mutations (create/update/delete)

  const resetTicketTypeForm = () => {
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

  const handleEditTicketType = (ticket) => {
    setEditingTicketType(ticket.id);
    setTicketTypeForm({
      name: ticket.name || '',
      price: ticket.basePrice?.toString() || ticket.price?.toString() || '',
      initialQuantity: ticket.initialQuantity?.toString() || '',
      benefits: ticket.benefits || '',
      expenses: ticket.expenses?.toString() || '',
      isGroup: ticket.isGroup || false,
      minQuantity: ticket.minQuantity?.toString() || '',
      maxQuantity: ticket.maxQuantity?.toString() || '',
      hasGenderPricing: ticket.hasGenderPricing || false,
      malePrice: ticket.malePrice?.toString() || '',
      femalePrice: ticket.femalePrice?.toString() || '',
    });
  };

  const handleSaveTicketType = async () => {
    // VIP List venues: simplified validation (quantity controlled by event capacity)
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

    setIsSavingTicketType(true);
    try {
      // VIP List venues: force group and gender pricing settings
      const isGroup = useVipListFlow ? true : ticketTypeForm.isGroup;
      const hasGenderPricing = useVipListFlow ? true : ticketTypeForm.hasGenderPricing;
      const name = useVipListFlow ? 'VIP List Entry' : ticketTypeForm.name;
      const benefits = useVipListFlow ? 'Per Person Consumibles' : (ticketTypeForm.benefits || null);
      const price = useVipListFlow ? 0 : parseFloat(ticketTypeForm.price);

      // For VIP venues: auto-set quantity based on event capacity
      // If unlimited (isUnlimited=true or ticket_limit=0), use 999999
      // Otherwise use the event's ticket_limit
      const autoQuantity = useVipListFlow
        ? (editForm.isUnlimited || !editForm.ticket_limit ? 999999 : parseInt(editForm.ticket_limit))
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
        // OPTIMISTIC UPDATE: Update local state immediately
        setTicketTypes(prev => prev.map(t =>
          t.id === editingTicketType ? { ...t, ...data, malePrice: data.malePrice, femalePrice: data.femalePrice } : t
        ));
        await ticketTypeService.updateTicketType(editingTicketType, data);
        Alert.alert('Success', 'Ticket type updated');
      } else {
        await ticketTypeService.createTicketType(id, data);
        Alert.alert('Success', 'Ticket type created');
      }

      resetTicketTypeForm();
      // Force reload after mutation to get server-confirmed data
      loadTicketTypesData(true);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save ticket type');
    } finally {
      setIsSavingTicketType(false);
    }
  };

  const handleDeleteTicketType = (ticketId, ticketName) => {
    Alert.alert(
      'Delete Ticket Type',
      `Are you sure you want to delete "${ticketName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // OPTIMISTIC UPDATE: Remove from local state immediately
            const previousTicketTypes = ticketTypes;
            setTicketTypes(prev => prev.filter(t => t.id !== ticketId));

            try {
              await ticketTypeService.deleteTicketType(ticketId);
              Alert.alert('Success', 'Ticket type deleted');
              // Force reload to confirm deletion
              loadTicketTypesData(true);
            } catch (error) {
              // ROLLBACK: Restore previous state on error
              setTicketTypes(previousTicketTypes);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete ticket type');
            }
          },
        },
      ]
    );
  };

  // =============================================================================
  // GUEST LIST TYPE FUNCTIONS
  // =============================================================================

  // Note: loadGuestListTypes is now loadGuestListTypesData defined above

  const resetGuestListForm = () => {
    setGuestListForm({
      name: '',
      description: '',
      maxCapacity: '',
      allowedGender: '',
      isActive: true,
    });
    setEditingGuestListType(null);
  };

  const handleEditGuestListType = (guestList) => {
    setEditingGuestListType(guestList.id);
    setGuestListForm({
      name: guestList.name || '',
      description: guestList.description || '',
      maxCapacity: guestList.max_capacity?.toString() || '',
      allowedGender: guestList.allowed_gender || '',
      isActive: guestList.is_active !== false,
    });
  };

  const handleSaveGuestListType = async () => {
    if (!guestListForm.name) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsSavingGuestList(true);
    try {
      const data = {
        event_id: id,
        name: guestListForm.name,
        description: guestListForm.description || null,
        max_capacity: guestListForm.maxCapacity ? parseInt(guestListForm.maxCapacity) : null,
        allowed_gender: guestListForm.allowedGender || null,
        is_active: guestListForm.isActive,
      };

      if (editingGuestListType) {
        // OPTIMISTIC UPDATE: Update local state immediately
        setGuestListTypes(prev => prev.map(g =>
          g.id === editingGuestListType ? { ...g, ...data } : g
        ));
        await guestListService.updateGuestListType(editingGuestListType, data);
        Alert.alert('Success', 'Guest list updated');
      } else {
        await guestListService.createGuestListType(data);
        Alert.alert('Success', 'Guest list created');
      }

      resetGuestListForm();
      // Force reload after mutation
      loadGuestListTypesData(true);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save guest list');
    } finally {
      setIsSavingGuestList(false);
    }
  };

  const handleDeleteGuestListType = (guestListId, guestListName) => {
    Alert.alert(
      'Delete Guest List',
      `Are you sure you want to delete "${guestListName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // OPTIMISTIC UPDATE: Remove from local state immediately
            const previousGuestListTypes = guestListTypes;
            setGuestListTypes(prev => prev.filter(g => g.id !== guestListId));

            try {
              await guestListService.deleteGuestListType(guestListId);
              Alert.alert('Success', 'Guest list deleted');
              // Force reload to confirm deletion
              loadGuestListTypesData(true);
            } catch (error) {
              // ROLLBACK: Restore previous state on error
              setGuestListTypes(previousGuestListTypes);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete guest list');
            }
          },
        },
      ]
    );
  };

  // OPTIMIZED: onRefresh forces reload of all data (bypasses cache)
  const onRefresh = () => {
    if (id) {
      fetchEventDetail(id);
      loadTicketTypesData(true); // Force reload
      loadGuestListTypesData(true); // Force reload
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Pick image from gallery for edit
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select an event image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageAsset = result.assets[0];

        const validation = uploadService.validateImage(imageAsset);
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.error);
          return;
        }

        setSelectedImage(imageAsset);
      }
    } catch {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Remove selected image and revert to original
  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove the selected image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setSelectedImage(null),
        },
      ]
    );
  };

  const handleEditSubmit = async () => {
    if (!editForm.name || !editForm.event_date || !editForm.start_time || !editForm.end_time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate capacity: either unlimited or a positive number
    if (!editForm.isUnlimited && (!editForm.ticket_limit || parseInt(editForm.ticket_limit) <= 0)) {
      Alert.alert('Error', 'Ingresa una capacidad mayor a 0, o activa capacidad ilimitada');
      return;
    }

    setIsUploadingImage(true);

    try {
      let imageUrl = editForm.image;

      // If a new image was selected, upload it first
      if (selectedImage) {
        const uploadResult = await uploadService.uploadEventImage(selectedImage.uri);

        if (!uploadResult.success) {
          Alert.alert('Upload Error', uploadResult.error || 'Failed to upload image');
          setIsUploadingImage(false);
          return;
        }

        imageUrl = uploadResult.data.url;
      }

      setIsUploadingImage(false);

      // If unlimited, send ticket_limit=0 and is_unlimited=true
      // Otherwise, send the entered ticket_limit value
      const ticketLimitValue = editForm.isUnlimited ? 0 : (parseInt(editForm.ticket_limit) || 0);

      const result = await updateEvent(id, {
        name: editForm.name,
        description: editForm.description,
        image: imageUrl,
        event_date: editForm.event_date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        ticket_limit: ticketLimitValue,
        is_unlimited: editForm.isUnlimited,
        dress_code: editForm.dress_code,
        min_age: editForm.min_age ? parseInt(editForm.min_age) : 18,
        custom_location: editForm.custom_location,
      });

      if (result.success) {
        Alert.alert('Success', 'Event updated successfully');
        setSelectedImage(null);
        // OPTIMIZED: Only refresh event details, not ticket types and guest lists
        // (they didn't change when editing event info)
        fetchEventDetail(id);
      } else {
        Alert.alert('Error', result.error || 'Failed to update event');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEvent(id);

            if (result.success) {
              Alert.alert('Success', 'Event deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  // Open date picker with current value
  const openDatePicker = () => {
    setTempDate(editForm.event_date ? new Date(editForm.event_date) : new Date());
    setShowDatePicker(true);
  };

  // Open start time picker with current value
  const openStartTimePicker = () => {
    if (editForm.start_time) {
      const [hours, minutes] = editForm.start_time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      setTempStartTime(date);
    } else {
      const date = new Date();
      date.setHours(21, 0, 0);
      setTempStartTime(date);
    }
    setShowStartTimePicker(true);
  };

  // Open end time picker with current value
  const openEndTimePicker = () => {
    if (editForm.end_time) {
      const [hours, minutes] = editForm.end_time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      setTempEndTime(date);
    } else {
      const date = new Date();
      date.setHours(3, 0, 0);
      setTempEndTime(date);
    }
    setShowEndTimePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const formatted = selectedDate.toISOString().split('T')[0];
        setEditForm({ ...editForm, event_date: formatted });
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmDateSelection = () => {
    const formatted = tempDate.toISOString().split('T')[0];
    setEditForm({ ...editForm, event_date: formatted });
    setShowDatePicker(false);
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const hours = selectedTime.getHours().toString().padStart(2, '0');
        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
        setEditForm({ ...editForm, start_time: `${hours}:${minutes}:00` });
      }
    } else {
      if (selectedTime) {
        setTempStartTime(selectedTime);
      }
    }
  };

  const confirmStartTimeSelection = () => {
    const hours = tempStartTime.getHours().toString().padStart(2, '0');
    const minutes = tempStartTime.getMinutes().toString().padStart(2, '0');
    setEditForm({ ...editForm, start_time: `${hours}:${minutes}:00` });
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const hours = selectedTime.getHours().toString().padStart(2, '0');
        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
        setEditForm({ ...editForm, end_time: `${hours}:${minutes}:00` });
      }
    } else {
      if (selectedTime) {
        setTempEndTime(selectedTime);
      }
    }
  };

  const confirmEndTimeSelection = () => {
    const hours = tempEndTime.getHours().toString().padStart(2, '0');
    const minutes = tempEndTime.getMinutes().toString().padStart(2, '0');
    setEditForm({ ...editForm, end_time: `${hours}:${minutes}:00` });
    setShowEndTimePicker(false);
  };

  if (isLoadingEventDetail) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
            </View>
            <Text style={styles.loadingText}>Loading event details...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (eventDetailError) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={32} color="rgb(239, 68, 68)" />
            </View>
            <Text style={styles.errorTitle}>Error Loading Event</Text>
            <Text style={styles.errorText}>{eventDetailError}</Text>
            <TouchableOpacity onPress={onRefresh} activeOpacity={0.8} style={styles.retryButton}>
              <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                <View style={styles.retryButtonInner}>
                  <Ionicons name="refresh" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  if (!currentEvent) {
    return (
      <BackgroundGlow>
        <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={32} color="rgba(255, 255, 255, 0.5)" />
            </View>
            <Text style={styles.emptyTitle}>Event Not Found</Text>
            <Text style={styles.emptyText}>The event you're looking for doesn't exist.</Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.retryButton}>
              <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                <View style={styles.backButtonInner}>
                  <Ionicons name="arrow-back" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.backButtonText}>Go Back</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  const backgroundImage = currentEvent.event_img
    ? { uri: currentEvent.event_img }
    : require('../../../assets/fondo.webp');

  const currencySymbol = getCurrencySymbol(currentEvent?.currency);

  return (
    <BackgroundGlow>
      <CustomHeader showBackButton scrollY={scrollY} enableBlurOnScroll />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEventDetail}
            onRefresh={onRefresh}
            tintColor="rgb(168, 85, 255)"
          />
        }
      >
          {/* Event Image Card with Blur Background */}
          <View style={styles.imageCard}>
            {/* Blurred background */}
            <ImageBackground
              source={{
                uri: currentEvent.event_img || 'https://via.placeholder.com/400x250?text=No+Image',
              }}
              style={styles.imageBlurBg}
              resizeMode="cover"
              blurRadius={20}
            >
              {/* Dark overlay */}
              <View style={styles.imageBlurOverlay} />
              {/* Actual poster image */}
              <Image
                source={{
                  uri: currentEvent.event_img || 'https://via.placeholder.com/400x250?text=No+Image',
                }}
                style={styles.eventImage}
                resizeMode="contain"
              />
            </ImageBackground>
          </View>

          {/* Event Title & Date */}
          <View style={styles.titleSection}>
            <Text style={styles.eventTitle}>{currentEvent.event_name}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="rgb(168, 85, 255)" />
              <Text style={styles.eventDate}>{formatDate(currentEvent.event_date)}</Text>
            </View>
          </View>

          {/* Info Tags - Different colors like web app */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagTime]}>
              <Ionicons name="time-outline" size={14} color="rgb(59, 130, 246)" />
              <Text style={[styles.tagText, styles.tagTextTime]}>
                {currentEvent.start_time?.slice(0, 5)} - {currentEvent.end_time?.slice(0, 5)}
              </Text>
            </View>
            <View style={[styles.tag, styles.tagAge]}>
              <Ionicons name="people-outline" size={14} color="rgb(168, 85, 255)" />
              <Text style={[styles.tagText, styles.tagTextAge]}>{currentEvent.min_age}+</Text>
            </View>
            {currentEvent.dress_code && (
              <View style={[styles.tag, styles.tagDress]}>
                <Ionicons name="shirt-outline" size={14} color="rgb(236, 72, 153)" />
                <Text style={[styles.tagText, styles.tagTextDress]}>{currentEvent.dress_code}</Text>
              </View>
            )}
            {currentEvent.custom_location && (
              <View style={[styles.tag, styles.tagLocation]}>
                <Ionicons name="location-outline" size={14} color="rgb(52, 211, 153)" />
                <Text style={[styles.tagText, styles.tagTextLocation]}>{currentEvent.custom_location}</Text>
              </View>
            )}
          </View>

          {/* VIP Capacity & Tables - Only for VIP venues */}
          {useVipListFlow && (
            <View style={styles.capacityInfoContainer}>
              <View style={styles.capacityInfoItem}>
                <Ionicons name="people" size={16} color="rgb(168, 85, 255)" />
                <Text style={styles.capacityInfoLabel}>Capacity:</Text>
                <Text style={styles.capacityInfoValue}>
                  {currentEvent.ticket_limit > 0 ? `${currentEvent.ticket_limit} people` : 'Unlimited'}
                </Text>
              </View>
              <View style={styles.capacityInfoItem}>
                <Ionicons name="grid" size={16} color="rgb(52, 211, 153)" />
                <Text style={styles.capacityInfoLabel}>Tables:</Text>
                <Text style={styles.capacityInfoValue}>
                  {currentEvent.table_capacity > 0 ? currentEvent.table_capacity : 'Not set'}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {currentEvent.description && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.descriptionText}>{currentEvent.description}</Text>
            </View>
          )}

          {/* Individual Tickets Section - Hidden for VIP List venues */}
          {!useVipListFlow && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="ticket-outline" size={16} color="rgb(168, 85, 255)" />
                </View>
                <Text style={[styles.sectionLabel, styles.sectionLabelTickets]}>Tickets</Text>
                {isLoadingTicketTypes && (
                  <ActivityIndicator size="small" color="rgba(168, 85, 255, 0.5)" />
                )}
              </View>

              {!isLoadingTicketTypes && ticketTypes.filter(t => !t.isGroup && !t.is_group).length === 0 ? (
                <Text style={styles.emptyText}>No individual tickets available</Text>
              ) : (
                <View style={styles.ticketsList}>
                  {ticketTypes.filter(t => !t.isGroup && !t.is_group).map((ticket, index) => {
                    const available = ticket.availableQuantity ?? ticket.available_quantity ?? 0;
                    // For VIP venues: capacity is controlled by event.ticket_limit, not ticket type
                    // For regular venues: use ticket type's available_quantity
                    const isEventUnlimited = !currentEvent?.ticket_limit || currentEvent.ticket_limit === 0;
                    const eventCapacity = currentEvent?.ticket_limit || 0;
                    // VIP venues never show "sold out" based on ticket type - capacity is from event
                    const isSoldOut = useVipListFlow ? false : (available === 0);
                    // Get gender-based prices for VIP venues
                    const malePrice = ticket.malePrice ?? ticket.male_price ?? 0;
                    const femalePrice = ticket.femalePrice ?? ticket.female_price ?? 0;
                    const hasGenderPricing = (ticket.hasGenderPricing ?? ticket.has_gender_pricing) && malePrice > 0;

                    return (
                      <View key={ticket.id || index} style={[styles.ticketItem, styles.ticketItemIndividual, isSoldOut && styles.ticketItemSoldOut]}>
                        <View style={styles.ticketHeader}>
                          <Text style={styles.ticketName}>{ticket.name}</Text>
                          {hasGenderPricing ? (
                            <Text style={styles.genderPrice}>
                              M: {currencySymbol}{malePrice.toFixed(2)} / F: {currencySymbol}{femalePrice.toFixed(2)}
                            </Text>
                          ) : (
                            <Text style={[styles.ticketPrice, styles.ticketPriceIndividual]}>
                              {currencySymbol}{ticket.price?.toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.ticketDetails}>
                          {isSoldOut ? (
                            <View style={styles.soldOutBadge}>
                              <Text style={styles.soldOutText}>Sold Out</Text>
                            </View>
                          ) : useVipListFlow ? (
                            <Text style={styles.ticketAvailability}>
                              {isEventUnlimited ? 'Unlimited capacity' : `Capacity: ${eventCapacity}`}
                            </Text>
                          ) : (
                            <Text style={styles.ticketAvailability}>
                              {available}/{ticket.initialQuantity || ticket.initial_quantity} available
                            </Text>
                          )}
                        </View>
                        {ticket.benefits && (
                          <Text style={styles.ticketBenefits}>{ticket.benefits}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Group Tickets Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="people-outline" size={16} color="rgb(59, 130, 246)" />
              </View>
              <Text style={[styles.sectionLabel, styles.sectionLabelGroups]}>Groups</Text>
              {isLoadingTicketTypes && (
                <ActivityIndicator size="small" color="rgba(168, 85, 255, 0.5)" />
              )}
            </View>

            {!isLoadingTicketTypes && ticketTypes.filter(t => t.isGroup || t.is_group).length === 0 ? (
              <Text style={styles.emptyText}>No group tickets available</Text>
            ) : (
              <View style={styles.ticketsList}>
                {ticketTypes.filter(t => t.isGroup || t.is_group).map((ticket, index) => {
                  const available = ticket.availableQuantity ?? ticket.available_quantity ?? 0;
                  // For VIP venues: capacity is controlled by event.ticket_limit, not ticket type
                  // For regular venues: use ticket type's available_quantity
                  const isEventUnlimited = !currentEvent?.ticket_limit || currentEvent.ticket_limit === 0;
                  const eventCapacity = currentEvent?.ticket_limit || 0;
                  // VIP venues never show "sold out" based on ticket type - capacity is from event
                  const isSoldOut = useVipListFlow ? false : (available === 0);
                  // Get gender-based prices for VIP venues
                  const malePrice = ticket.malePrice ?? ticket.male_price ?? 0;
                  const femalePrice = ticket.femalePrice ?? ticket.female_price ?? 0;
                  const hasGenderPricing = (ticket.hasGenderPricing ?? ticket.has_gender_pricing) && malePrice > 0;

                  return (
                    <View key={ticket.id || index} style={[styles.ticketItem, styles.ticketItemGroup, isSoldOut && styles.ticketItemSoldOut]}>
                      <View style={styles.ticketHeader}>
                        <Text style={styles.ticketName}>{ticket.name}</Text>
                        {hasGenderPricing ? (
                          <Text style={styles.genderPrice}>
                            M: {currencySymbol}{malePrice.toFixed(2)} / F: {currencySymbol}{femalePrice.toFixed(2)}
                          </Text>
                        ) : (
                          <Text style={[styles.ticketPrice, styles.ticketPriceGroup]}>
                            {currencySymbol}{ticket.price?.toFixed(2)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.ticketDetails}>
                        {isSoldOut ? (
                          <View style={styles.soldOutBadge}>
                            <Text style={styles.soldOutText}>Sold Out</Text>
                          </View>
                        ) : useVipListFlow ? (
                          <Text style={styles.ticketAvailability}>
                            {isEventUnlimited ? 'Unlimited capacity' : `Capacity: ${eventCapacity}`}
                          </Text>
                        ) : (
                          <Text style={styles.ticketAvailability}>
                            {available}/{ticket.initialQuantity || ticket.initial_quantity} available
                          </Text>
                        )}
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>
                            {ticket.minQuantity || ticket.min_quantity}-{ticket.maxQuantity || ticket.max_quantity} people
                          </Text>
                        </View>
                      </View>
                      {ticket.benefits && (
                        <Text style={styles.ticketBenefits}>{ticket.benefits}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Guest Lists Section - Hidden for VIP List venues */}
          {!useVipListFlow && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="list-outline" size={16} color="rgb(52, 211, 153)" />
                </View>
                <Text style={[styles.sectionLabel, styles.sectionLabelGuestLists]}>Guest Lists</Text>
                {isLoadingGuestLists && (
                  <ActivityIndicator size="small" color="rgba(52, 211, 153, 0.5)" />
                )}
              </View>

              {!isLoadingGuestLists && guestListTypes.length === 0 ? (
                <Text style={styles.emptyText}>No guest lists available</Text>
              ) : (
                <View style={styles.guestListsList}>
                  {guestListTypes.map((guestList, index) => (
                    <View key={guestList.id || index} style={styles.guestListItem}>
                      <View style={styles.guestListHeader}>
                        <Text style={styles.guestListName}>{guestList.name}</Text>
                        <View style={[
                          styles.statusDot,
                          (guestList.isActive || guestList.is_active) ? styles.statusDotActive : styles.statusDotInactive
                        ]} />
                      </View>
                      {guestList.description && (
                        <Text style={styles.guestListDescription}>{guestList.description}</Text>
                      )}
                      <View style={styles.guestListMeta}>
                        {(guestList.maxCapacity || guestList.max_capacity) && (
                          <Text style={styles.guestListMetaText}>
                            Capacity: {guestList.maxCapacity || guestList.max_capacity}
                          </Text>
                        )}
                        {(guestList.allowedGender || guestList.allowed_gender) && (
                          <Text style={styles.guestListMetaText}>
                            {(guestList.allowedGender || guestList.allowed_gender) === 'male' ? 'Male only' :
                             (guestList.allowedGender || guestList.allowed_gender) === 'female' ? 'Female only' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Bottom spacing for FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Floating Action Buttons for Admins */}
        {user?.role === 'admin' && (
          <View style={styles.fabContainer}>
            {/* Edit Event Button */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/EventosList/EventoEditar', params: { id } })}
              activeOpacity={0.8}
              style={styles.fab}
            >
              <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
                <View style={styles.fabInner}>
                  <Ionicons name="pencil" size={18} color="white" />
                  <Text style={styles.fabText}>Edit Event</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Manage Tickets Button */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/EventosList/TicketsGestion', params: { id } })}
              activeOpacity={0.8}
              style={[styles.fab, styles.fabSecondary]}
            >
              <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
                <View style={styles.fabInnerPurple}>
                  <Ionicons name="ticket-outline" size={18} color="rgb(168, 85, 255)" />
                  <Text style={styles.fabTextPurple}>Tickets</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Manage Guest Lists Button - Hidden for VIP List venues */}
            {!useVipListFlow && (
              <TouchableOpacity
                onPress={() => setIsGuestListModalVisible(true)}
                activeOpacity={0.8}
                style={[styles.fab, styles.fabSecondary]}
              >
                <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
                  <View style={styles.fabInnerGreen}>
                    <Ionicons name="list-outline" size={18} color="rgb(52, 211, 153)" />
                    <Text style={styles.fabTextGreen}>Lists</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* TICKET TYPES MODAL */}
        <Modal
          visible={isTicketTypesModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsTicketTypesModalVisible(false);
            resetTicketTypeForm();
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
                <View style={styles.modalContentNew}>
                  <View style={styles.modalHeaderNew}>
                    <Text style={styles.modalTitleNew}>Ticket Types</Text>
                    <TouchableOpacity onPress={() => {
                      setIsTicketTypesModalVisible(false);
                      resetTicketTypeForm();
                    }}>
                      <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalScrollNew} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                  {/* Existing Ticket Types List */}
                  {isLoadingTicketTypes ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
                    </View>
                  ) : ticketTypes.length > 0 ? (
                    <View style={styles.ticketTypesList}>
                      {ticketTypes.map((ticket) => {
                        const currencySymbol = getCurrencySymbol(ticket.currency || currentEvent?.currency);
                        return (
                          <BlurView key={ticket.id} intensity={40} tint="dark" style={styles.ticketTypeItemBlur}>
                            <View style={styles.ticketTypeItem}>
                              <View style={styles.ticketTypeInfo}>
                                <Text style={styles.ticketTypeName}>{ticket.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                  <Text style={styles.ticketTypePricePurple}>
                                    {currencySymbol}{ticket.price?.toFixed(2)}
                                  </Text>
                                  <Text style={styles.ticketTypeQtyText}>
                                    {ticket.availableQuantity}/{ticket.initialQuantity} available
                                  </Text>
                                </View>
                                {ticket.isGroup && (
                                  <View style={styles.ticketTypeBadges}>
                                    <View style={styles.ticketTypeBadge}>
                                      <Text style={styles.ticketTypeBadgeText}>
                                        Group: {ticket.minQuantity}-{ticket.maxQuantity}
                                      </Text>
                                    </View>
                                    {ticket.hasGenderPricing && (
                                      <View style={[styles.ticketTypeBadge, { backgroundColor: 'rgba(232, 121, 249, 0.2)' }]}>
                                        <Text style={[styles.ticketTypeBadgeText, { color: 'rgba(232, 121, 249, 0.9)' }]}>
                                          M: {currencySymbol}{ticket.malePrice?.toFixed(2)} / F: {currencySymbol}{ticket.femalePrice?.toFixed(2)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                              <View style={styles.ticketTypeActions}>
                                <TouchableOpacity
                                  onPress={() => handleEditTicketType(ticket)}
                                  activeOpacity={0.7}
                                >
                                  <BlurView intensity={60} tint="dark" style={styles.ticketTypeActionBtnBlur}>
                                    <View style={styles.ticketTypeActionBtnInner}>
                                      <Ionicons name="pencil" size={16} color="rgba(139, 92, 246, 0.9)" />
                                    </View>
                                  </BlurView>
                                </TouchableOpacity>
                                {/* Hide delete button for VIP venues - they should only have one ticket type */}
                                {!useVipListFlow && (
                                  <TouchableOpacity
                                    onPress={() => handleDeleteTicketType(ticket.id, ticket.name)}
                                    activeOpacity={0.7}
                                  >
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
                  ) : (
                    <View style={styles.emptyTicketTypes}>
                      <Ionicons name="ticket-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                      <Text style={styles.emptyTicketTypesText}>
                        {useVipListFlow ? 'No VIP pricing set yet' : 'No ticket types yet'}
                      </Text>
                    </View>
                  )}

                  {/* Ticket Type Form - For VIP venues, only show when no tickets exist or editing */}
                  {useVipListFlow && ticketTypes.length > 0 && !editingTicketType ? (
                    // VIP venue already has pricing set - show message to tap to edit
                    <View style={styles.vipPricingSetBanner}>
                      <Ionicons name="checkmark-circle" size={24} color="rgb(52, 211, 153)" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vipPricingSetTitle}>VIP Pricing Set</Text>
                        <Text style={styles.vipPricingSetText}>Tap the edit button above to modify pricing</Text>
                      </View>
                    </View>
                  ) : (
                  <View style={styles.ticketTypeForm}>
                    <Text style={styles.ticketTypeFormTitle}>
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
                        <Text style={styles.fieldLabel}>Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="ticket-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                          <TextInput
                            style={styles.inputWithIcon}
                            value={ticketTypeForm.name}
                            onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, name: text })}
                            placeholder="e.g., General Admission, VIP"
                            placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          />
                        </View>
                      </View>
                    )}

                    {/* Price and Quantity Row - Different for VIP venues */}
                    {useVipListFlow ? (
                      // VIP Venues: No quantity field - controlled by event's ticket_limit
                      // The quantity will be auto-set when saving based on event capacity
                      null
                    ) : (
                      // Regular Venues: Price and Quantity
                      <View style={styles.timeRowNew}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Price <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="cash-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
                              value={ticketTypeForm.price}
                              onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, price: text })}
                              placeholder="0.00"
                              placeholderTextColor="rgba(255, 255, 255, 0.35)"
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Quantity <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="layers-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
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

                    {/* VIP Venues: Min/Max People (always shown) */}
                    {useVipListFlow && (
                      <View style={styles.timeRowNew}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Min People <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
                              value={ticketTypeForm.minQuantity}
                              onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, minQuantity: text })}
                              placeholder="1"
                              placeholderTextColor="rgba(255, 255, 255, 0.35)"
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Max People <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="add-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
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

                    {/* VIP Venues: Gender Prices (always shown) */}
                    {useVipListFlow && (
                      <View style={styles.timeRowNew}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>
                            <Ionicons name="male" size={14} color="rgb(59, 130, 246)" /> Male Price <Text style={styles.required}>*</Text>
                          </Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="male-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
                              value={ticketTypeForm.malePrice}
                              onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, malePrice: text })}
                              placeholder="0.00"
                              placeholderTextColor="rgba(255, 255, 255, 0.35)"
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>
                            <Ionicons name="female" size={14} color="rgb(236, 72, 153)" /> Female Price <Text style={styles.required}>*</Text>
                          </Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="female-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.inputWithIcon}
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
                        <Text style={styles.fieldLabel}>Benefits <Text style={styles.required}>*</Text></Text>
                        <TextInput
                          style={[styles.inputSimple, styles.textAreaNew]}
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
                        <Text style={styles.fieldLabel}>Internal Expenses</Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="wallet-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                          <TextInput
                            style={styles.inputWithIcon}
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
                          <Text style={styles.fieldLabel}>Group Ticket</Text>
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
                        {/* Min/Max People Row */}
                        <View style={styles.timeRowNew}>
                          <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.fieldLabel}>Min People <Text style={styles.required}>*</Text></Text>
                            <View style={styles.inputWrapper}>
                              <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                              <TextInput
                                style={styles.inputWithIcon}
                                value={ticketTypeForm.minQuantity}
                                onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, minQuantity: text })}
                                placeholder="1"
                                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                                keyboardType="number-pad"
                              />
                            </View>
                          </View>
                          <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.fieldLabel}>Max People <Text style={styles.required}>*</Text></Text>
                            <View style={styles.inputWrapper}>
                              <Ionicons name="add-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                              <TextInput
                                style={styles.inputWithIcon}
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
                            <Text style={styles.fieldLabel}>Gender-Based Pricing</Text>
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
                          <View style={styles.timeRowNew}>
                            <View style={[styles.field, { flex: 1 }]}>
                              <Text style={styles.fieldLabel}>Male Price <Text style={styles.required}>*</Text></Text>
                              <View style={styles.inputWrapper}>
                                <Ionicons name="male-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                                <TextInput
                                  style={styles.inputWithIcon}
                                  value={ticketTypeForm.malePrice}
                                  onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, malePrice: text })}
                                  placeholder="0.00"
                                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                                  keyboardType="decimal-pad"
                                />
                              </View>
                            </View>
                            <View style={[styles.field, { flex: 1 }]}>
                              <Text style={styles.fieldLabel}>Female Price <Text style={styles.required}>*</Text></Text>
                              <View style={styles.inputWrapper}>
                                <Ionicons name="female-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                                <TextInput
                                  style={styles.inputWithIcon}
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

                    {/* Action Buttons */}
                    <View style={styles.ticketTypeFormButtons}>
                      {editingTicketType && (
                        <TouchableOpacity
                          onPress={resetTicketTypeForm}
                          activeOpacity={0.8}
                          style={styles.cancelButtonNew}
                        >
                          <BlurView intensity={60} tint="dark" style={styles.buttonBlurNew}>
                            <View style={styles.cancelButtonInnerNew}>
                              <Ionicons name="close" size={18} color="rgb(239, 68, 68)" />
                              <Text style={styles.cancelButtonTextNew}>Cancel</Text>
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={handleSaveTicketType}
                        disabled={isSavingTicketType}
                        activeOpacity={0.8}
                        style={[styles.submitButtonNew, { flex: editingTicketType ? 1 : 2 }]}
                      >
                        <BlurView intensity={60} tint="dark" style={styles.buttonBlurNew}>
                          <View style={styles.submitButtonInnerNew}>
                            {isSavingTicketType ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <>
                                <Ionicons name={editingTicketType ? 'checkmark' : 'add'} size={18} color="white" />
                                <Text style={styles.submitButtonTextNew}>
                                  {editingTicketType
                                    ? 'Update'
                                    : (useVipListFlow ? 'Set VIP Pricing' : 'Add Ticket Type')}
                                </Text>
                              </>
                            )}
                          </View>
                        </BlurView>
                      </TouchableOpacity>
                    </View>
                  </View>
                  )}
                  </ScrollView>
                </View>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* GUEST LIST TYPES MODAL */}
        <Modal
          visible={isGuestListModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsGuestListModalVisible(false);
            resetGuestListForm();
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
                <View style={styles.modalContentNew}>
                  <View style={styles.modalHeaderNew}>
                    <Text style={styles.modalTitleNew}>Guest Lists</Text>
                    <TouchableOpacity onPress={() => {
                      setIsGuestListModalVisible(false);
                      resetGuestListForm();
                    }}>
                      <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalScrollNew} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                  {/* Info Notice */}
                  <View style={[styles.feeNotice, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Ionicons name="information-circle" size={18} color="rgba(34, 197, 94, 0.9)" />
                    <Text style={[styles.feeNoticeText, { color: 'rgba(34, 197, 94, 0.9)' }]}>
                      Guest lists are free entry - users sign up and staff approves
                    </Text>
                  </View>

                  {/* Existing Guest List Types */}
                  {isLoadingGuestLists ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="rgba(34, 197, 94, 0.9)" />
                    </View>
                  ) : guestListTypes.length > 0 ? (
                    <View style={styles.ticketTypesList}>
                      {guestListTypes.map((guestList) => (
                        <BlurView key={guestList.id} intensity={40} tint="dark" style={styles.ticketTypeItemBlur}>
                          <View style={styles.ticketTypeItem}>
                            <View style={styles.ticketTypeInfo}>
                              <Text style={styles.ticketTypeName}>{guestList.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <View style={styles.freeBadgeSmall}>
                                  <Text style={styles.freeBadgeSmallText}>FREE</Text>
                                </View>
                                {guestList.max_capacity && (
                                  <Text style={styles.ticketTypeDetails}>
                                    Capacity: {guestList.max_capacity}
                                  </Text>
                                )}
                                {guestList.allowed_gender && (
                                  <View style={styles.genderBadgeSmall}>
                                    <Ionicons
                                      name={guestList.allowed_gender === 'male' ? 'male' : 'female'}
                                      size={12}
                                      color={guestList.allowed_gender === 'male' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)'}
                                    />
                                    <Text style={[
                                      styles.genderBadgeSmallText,
                                      { color: guestList.allowed_gender === 'male' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)' }
                                    ]}>
                                      {guestList.allowed_gender === 'male' ? 'Men' : 'Women'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {guestList.description && (
                                <Text style={styles.guestListDescSmall} numberOfLines={1}>
                                  {guestList.description}
                                </Text>
                              )}
                            </View>
                            <View style={styles.ticketTypeActions}>
                              <TouchableOpacity
                                onPress={() => handleEditGuestListType(guestList)}
                                activeOpacity={0.7}
                              >
                                <BlurView intensity={60} tint="dark" style={styles.ticketTypeActionBtnBlur}>
                                  <View style={[styles.ticketTypeActionBtnInner, { borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                                    <Ionicons name="pencil" size={16} color="rgba(34, 197, 94, 0.9)" />
                                  </View>
                                </BlurView>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteGuestListType(guestList.id, guestList.name)}
                                activeOpacity={0.7}
                              >
                                <BlurView intensity={60} tint="dark" style={styles.ticketTypeActionBtnBlur}>
                                  <View style={[styles.ticketTypeActionBtnInner, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                                    <Ionicons name="trash" size={16} color="rgba(239, 68, 68, 0.9)" />
                                  </View>
                                </BlurView>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </BlurView>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyTicketTypes}>
                      <Ionicons name="list-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                      <Text style={styles.emptyTicketTypesText}>No guest lists yet</Text>
                    </View>
                  )}

                  {/* Guest List Form */}
                  <View style={styles.ticketTypeForm}>
                    <Text style={styles.ticketTypeFormTitle}>
                      {editingGuestListType ? 'Edit Guest List' : 'Add New Guest List'}
                    </Text>

                    {/* Name Field */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Name <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="list-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          value={guestListForm.name}
                          onChangeText={(text) => setGuestListForm({ ...guestListForm, name: text })}
                          placeholder="e.g., General List, VIP List"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        />
                      </View>
                    </View>

                    {/* Description Field */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={[styles.inputSimple, styles.textAreaNew]}
                        value={guestListForm.description}
                        onChangeText={(text) => setGuestListForm({ ...guestListForm, description: text })}
                        placeholder="Enter list description..."
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {/* Max Capacity Field */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Max Capacity <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="people-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          value={guestListForm.maxCapacity}
                          onChangeText={(text) => setGuestListForm({ ...guestListForm, maxCapacity: text })}
                          placeholder="Enter maximum capacity"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>

                    {/* Gender Restriction */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Gender Restriction <Text style={styles.required}>*</Text></Text>
                      <View style={styles.genderSelectorRow}>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            guestListForm.allowedGender === '' && styles.genderOptionActive,
                          ]}
                          onPress={() => setGuestListForm({ ...guestListForm, allowedGender: '' })}
                        >
                          <Ionicons name="people" size={18} color={guestListForm.allowedGender === '' ? 'white' : 'rgba(255,255,255,0.5)'} />
                          <Text style={[styles.genderOptionText, guestListForm.allowedGender === '' && styles.genderOptionTextActive]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            guestListForm.allowedGender === 'male' && styles.genderOptionMale,
                          ]}
                          onPress={() => setGuestListForm({ ...guestListForm, allowedGender: 'male' })}
                        >
                          <Ionicons name="male" size={18} color={guestListForm.allowedGender === 'male' ? 'rgba(59, 130, 246, 1)' : 'rgba(255,255,255,0.5)'} />
                          <Text style={[styles.genderOptionText, guestListForm.allowedGender === 'male' && { color: 'rgba(59, 130, 246, 1)' }]}>Men</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            guestListForm.allowedGender === 'female' && styles.genderOptionFemale,
                          ]}
                          onPress={() => setGuestListForm({ ...guestListForm, allowedGender: 'female' })}
                        >
                          <Ionicons name="female" size={18} color={guestListForm.allowedGender === 'female' ? 'rgba(236, 72, 153, 1)' : 'rgba(255,255,255,0.5)'} />
                          <Text style={[styles.genderOptionText, guestListForm.allowedGender === 'female' && { color: 'rgba(236, 72, 153, 1)' }]}>Women</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Active Toggle */}
                    <View style={styles.switchRow}>
                      <View>
                        <Text style={styles.fieldLabel}>Active</Text>
                        <Text style={styles.labelSubtext}>Users can sign up</Text>
                      </View>
                      <Switch
                        value={guestListForm.isActive}
                        onValueChange={(value) => setGuestListForm({ ...guestListForm, isActive: value })}
                        trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(52, 211, 153, 0.5)' }}
                        thumbColor={guestListForm.isActive ? 'rgb(52, 211, 153)' : 'rgba(255, 255, 255, 0.8)'}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.ticketTypeFormButtons}>
                      {editingGuestListType && (
                        <TouchableOpacity
                          onPress={resetGuestListForm}
                          activeOpacity={0.8}
                          style={styles.cancelButtonNew}
                        >
                          <BlurView intensity={60} tint="dark" style={styles.buttonBlurNew}>
                            <View style={styles.cancelButtonInnerNew}>
                              <Ionicons name="close" size={18} color="rgb(239, 68, 68)" />
                              <Text style={styles.cancelButtonTextNew}>Cancel</Text>
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={handleSaveGuestListType}
                        disabled={isSavingGuestList}
                        activeOpacity={0.8}
                        style={[styles.addGuestListButtonNew, { flex: editingGuestListType ? 1 : 2 }]}
                      >
                        <BlurView intensity={60} tint="dark" style={styles.buttonBlurNew}>
                          <View style={styles.addGuestListButtonInner}>
                            {isSavingGuestList ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <>
                                <Ionicons name={editingGuestListType ? 'checkmark' : 'add'} size={18} color="white" />
                                <Text style={styles.addGuestListButtonText}>
                                  {editingGuestListType ? 'Update' : 'Add Guest List'}
                                </Text>
                              </>
                            )}
                          </View>
                        </BlurView>
                      </TouchableOpacity>
                    </View>
                  </View>
                  </ScrollView>

                  {/* iOS Date Picker - Inside edit modal as bottom sheet */}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <View style={styles.iosPickerBottomSheet}>
                      <View style={styles.pickerModalContent}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancelar</Text>
                          </TouchableOpacity>
                          <Text style={styles.pickerTitle}>Fecha del Evento</Text>
                          <TouchableOpacity onPress={confirmDateSelection}>
                            <Text style={styles.pickerConfirmText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={tempDate}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                          textColor="#ffffff"
                          style={styles.iosPicker}
                        />
                      </View>
                    </View>
                  )}

                  {/* iOS Start Time Picker - Inside edit modal as bottom sheet */}
                  {Platform.OS === 'ios' && showStartTimePicker && (
                    <View style={styles.iosPickerBottomSheet}>
                      <View style={styles.pickerModalContent}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancelar</Text>
                          </TouchableOpacity>
                          <Text style={styles.pickerTitle}>Hora de Inicio</Text>
                          <TouchableOpacity onPress={confirmStartTimeSelection}>
                            <Text style={styles.pickerConfirmText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={tempStartTime}
                          mode="time"
                          display="spinner"
                          is24Hour={true}
                          onChange={handleStartTimeChange}
                          textColor="#ffffff"
                          style={styles.iosPicker}
                        />
                      </View>
                    </View>
                  )}

                  {/* iOS End Time Picker - Inside edit modal as bottom sheet */}
                  {Platform.OS === 'ios' && showEndTimePicker && (
                    <View style={styles.iosPickerBottomSheet}>
                      <View style={styles.pickerModalContent}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancelar</Text>
                          </TouchableOpacity>
                          <Text style={styles.pickerTitle}>Hora de Fin</Text>
                          <TouchableOpacity onPress={confirmEndTimeSelection}>
                            <Text style={styles.pickerConfirmText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={tempEndTime}
                          mode="time"
                          display="spinner"
                          is24Hour={true}
                          onChange={handleEndTimeChange}
                          textColor="#ffffff"
                          style={styles.iosPicker}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
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
    paddingTop: 130,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Image Card with Blur
  imageCard: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imageBlurBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  eventTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Tags Row - Colored like web app
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Time tag - Blue
  tagTime: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tagTextTime: {
    color: 'rgb(96, 165, 250)',
  },
  // Age tag - Purple
  tagAge: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
  },
  tagTextAge: {
    color: 'rgb(192, 132, 252)',
  },
  // Dress code tag - Pink
  tagDress: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  tagTextDress: {
    color: 'rgb(244, 114, 182)',
  },
  // Location tag - Green
  tagLocation: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  tagTextLocation: {
    color: 'rgb(110, 231, 183)',
  },

  // Capacity Section (VIP venues)
  capacitySection: {
    marginBottom: 24,
    backgroundColor: 'rgba(168, 85, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.15)',
  },
  capacitySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  capacitySectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact capacity info container (vertical layout, no background)
  capacityInfoContainer: {
    marginBottom: 24,
    gap: 6,
  },
  capacityInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capacityInfoLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  capacityInfoValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  capacityNotConfigured: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  capacityNotConfiguredText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  capacityNotConfiguredSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionLabelTickets: {
    color: 'rgb(192, 132, 252)',
  },
  sectionLabelGroups: {
    color: 'rgb(96, 165, 250)',
  },
  sectionLabelGuestLists: {
    color: 'rgb(110, 231, 183)',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '400',
  },

  // Tickets
  ticketsList: {
    gap: 10,
  },
  ticketItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ticketItemIndividual: {
    borderColor: 'rgba(168, 85, 255, 0.15)',
  },
  ticketItemGroup: {
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  ticketItemSoldOut: {
    opacity: 0.6,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  ticketPrice: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
  ticketPriceIndividual: {
    color: 'rgb(192, 132, 252)',
  },
  ticketPriceGroup: {
    color: 'rgb(96, 165, 250)',
  },
  genderPricesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPrice: {
    color: 'rgb(168, 85, 255)',
    fontSize: 13,
    fontWeight: '600',
  },
  ticketDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketAvailability: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
  },
  ticketBadge: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ticketBadgeText: {
    color: 'rgba(168, 85, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  groupBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupBadgeText: {
    color: 'rgb(96, 165, 250)',
    fontSize: 11,
    fontWeight: '500',
  },
  soldOutBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  soldOutText: {
    color: 'rgb(248, 113, 113)',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketBenefits: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Guest Lists
  guestListsList: {
    gap: 10,
  },
  guestListItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  guestListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  guestListName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: 'rgb(52, 211, 153)',
  },
  statusDotInactive: {
    backgroundColor: 'rgb(239, 68, 68)',
  },
  guestListDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 6,
  },
  guestListMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  guestListMetaText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '400',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    zIndex: 100,
    flexDirection: 'column',
    gap: 10,
  },
  fab: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: 'rgba(168, 85, 255, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabSecondary: {
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  fabBlur: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 8,
  },
  fabInnerPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 8,
  },
  fabInnerGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  fabTextPurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 14,
    fontWeight: '600',
  },
  fabTextGreen: {
    color: 'rgb(52, 211, 153)',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Update Event Button (Modal)
  updateEventButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  updateEventButtonInner: {
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
  updateEventButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Delete Event Button (Modal)
  deleteEventButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 30,
  },
  deleteEventButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  deleteEventButtonText: {
    color: 'rgb(239, 68, 68)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading State
  loadingIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.3)',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '400',
  },

  // Error State
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 140,
  },
  retryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty State
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  backButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContainer: {
    flex: 1,
    margin: 20,
    marginTop: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContainerFull: {
    flex: 1,
    marginTop: 50,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 21, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  modalForm: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    color: 'white',
    fontSize: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButtonContainer: {
    marginTop: 10,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '300',
    marginTop: 16,
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
  linkText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '300',
  },
  // Ticket Types Styles
  ticketTypesSection: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  ticketTypesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketTypesSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  ticketTypesList: {
    gap: 12,
    marginBottom: 20,
  },
  ticketTypeItemBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
  },
  ticketTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketTypeInfo: {
    flex: 1,
  },
  ticketTypeName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  ticketTypeDetails: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  ticketTypeGroup: {
    color: 'rgba(139, 92, 246, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  ticketTypeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ticketTypeActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  ticketTypeActionBtnBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ticketTypeActionBtnInner: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  ticketTypeForm: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ticketTypeFormTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  vipInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  vipInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  vipPricingSetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  vipPricingSetTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  vipPricingSetText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketTypeFormButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelTicketBtn: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelTicketBtnText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  saveTicketBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveTicketBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  saveTicketBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Manage Ticket Types Button
  manageTicketsBtn: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  manageTicketsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  manageTicketsBtnText: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  // Fee Notice
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    marginBottom: 20,
  },
  feeNoticeText: {
    color: 'rgba(34, 211, 238, 0.9)',
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  // Loading Container
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty Ticket Types
  emptyTicketTypes: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginBottom: 20,
  },
  emptyTicketTypesText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '300',
    marginTop: 12,
  },
  // Ticket Type Badges
  ticketTypeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ticketTypeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketTypeBadgeText: {
    color: 'rgba(139, 92, 246, 0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
  // Label Subtext
  labelSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  // Glass Morphism Button Styles
  glassButtonContainer: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  glassButtonBlur: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  glassButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  glassButtonContainerSmall: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  glassButtonTextSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Image Picker Styles
  imagePickerButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 180,
  },
  imagePickerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  imagePickerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagePickerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  imagePickerHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  removeImageBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // Guest List specific styles
  freeBadgeSmall: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeSmallText: {
    color: 'rgba(34, 197, 94, 1)',
    fontSize: 10,
    fontWeight: '700',
  },
  genderBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genderBadgeSmallText: {
    fontSize: 10,
    fontWeight: '500',
  },
  guestListDescSmall: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  // Gender selector for modal
  genderSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  genderOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  genderOptionMale: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  genderOptionFemale: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  genderOptionText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: 'white',
  },

  // New Modal Styles (matching EventoNuevo)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalContentNew: {
    backgroundColor: 'rgba(15, 15, 21, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 20,
    maxHeight: '100%',
    position: 'relative',
    flex: 1,
  },
  modalHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleNew: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  modalScrollNew: {
    flexGrow: 1,
  },

  // Field Styles
  field: {
    gap: 8,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  required: {
    color: 'rgb(239, 68, 68)',
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: -4,
    marginBottom: 4,
  },
  // Unlimited toggle styles
  unlimitedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  unlimitedToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlimitedToggleText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  unlimitedToggleTextActive: {
    color: 'rgb(168, 85, 255)',
    fontWeight: '500',
  },
  capacityInputContainer: {
    marginTop: 12,
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
  inputWithIcon: {
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
  textAreaNew: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Date/Time Buttons
  dateButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  dateButtonTextNew: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  timeRowNew: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  // Image Picker New
  imagePickerButtonNew: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 180,
    backgroundColor: 'rgba(168, 85, 255, 0.05)',
  },
  imagePickerContentNew: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  imagePickerIconCircleNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerTitleNew: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagePickerSubtitleNew: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  imagePickerHintNew: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },

  // Buttons New
  buttonsContainerNew: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  buttonBlurNew: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButtonNew: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButtonInnerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  cancelButtonTextNew: {
    color: 'rgb(239, 68, 68)',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonNew: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonInnerNew: {
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
  submitButtonTextNew: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Add Buttons
  addButtonNew: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  addButtonInnerPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  addButtonTextPurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  addButtonInnerGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 12,
  },
  addButtonTextGreen: {
    color: 'rgb(52, 211, 153)',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // Manage Button Styles
  manageButtonInnerPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  manageButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
  manageButtonInnerGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 12,
  },
  manageButtonTextGreen: {
    color: 'rgb(52, 211, 153)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Ticket Price Styles
  ticketTypePricePurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
  ticketTypeQtyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
  },

  // Guest List Button Styles (Green)
  addGuestListButtonNew: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addGuestListButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 12,
  },
  addGuestListButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // iOS Picker Bottom Sheet (inside edit modal)
  iosPickerBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },

  // iOS Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  pickerCancelText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  pickerConfirmText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 16,
    fontWeight: '600',
  },
  iosPicker: {
    height: 200,
    backgroundColor: 'transparent',
  },
});