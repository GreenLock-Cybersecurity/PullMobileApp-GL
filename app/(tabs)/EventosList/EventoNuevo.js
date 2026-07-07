// app/(tabs)/EventosList/EventoNuevo.js - Clean Modern Design
import { useState, useRef } from 'react';
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
  SafeAreaView,
  Modal,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import { eventService } from '@/services/eventService';
import { guestListService } from '@/services/guestListService';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '@/services/uploadService';

export default function EventoNuevo() {
  const router = useRouter();
  const { selectedVenue } = useDataStore();
  const { user } = useAuthStore();

  // Check if this venue uses VIP List flow
  const useVipListFlow = user?.use_vip_list_flow || false;

  // Scroll tracking for navbar
  const scrollY = useRef(new Animated.Value(0)).current;

  // Step control: 1 = Event Details, 2 = Ticket Types, 3 = Guest Lists
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreatingGuestLists, setIsCreatingGuestLists] = useState(false);

  // Selected image state
  const [selectedImage, setSelectedImage] = useState(null);

  // Event form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    event_date: '',
    start_time: '',
    end_time: '',
    ticket_limit: '',
    dress_code: '',
    min_age: '18',
    custom_location: '',
  });

  // Ticket types array
  const [ticketTypes, setTicketTypes] = useState([]);

  // For adding/editing ticket type
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicketIndex, setEditingTicketIndex] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    name: '',
    price: '',
    quantity: '',
    benefits: '',
    is_group: false,
    min_quantity: '',
    max_quantity: '',
    has_gender_pricing: false,
    male_price: '',
    female_price: '',
  });

  // VIP List venues: capacity and table configuration
  const [vipCapacity, setVipCapacity] = useState({
    isUnlimited: true, // Default to unlimited people capacity
    totalCapacity: '', // Max people (ticket_limit)
    tableCount: '', // Number of physical tables available (always required)
  });

  // VIP List venues: multiple ticket types array
  const [vipTicketTypes, setVipTicketTypes] = useState([]);

  // For adding/editing VIP ticket type
  const [showVipTicketModal, setShowVipTicketModal] = useState(false);
  const [editingVipTicketIndex, setEditingVipTicketIndex] = useState(null);
  const [vipTicketForm, setVipTicketForm] = useState({
    name: '',
    male_price: '',
    female_price: '',
    min_quantity: '1',
    max_quantity: '20',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Temp values for iOS pickers (to allow cancel functionality)
  // Initialize with sensible defaults to avoid race conditions
  const getDefaultStartTime = () => {
    const date = new Date();
    date.setHours(21, 0, 0, 0); // Default 21:00
    return date;
  };
  const getDefaultEndTime = () => {
    const date = new Date();
    date.setHours(3, 0, 0, 0); // Default 03:00
    return date;
  };
  const [tempDate, setTempDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(getDefaultStartTime);
  const [tempEndTime, setTempEndTime] = useState(getDefaultEndTime);

  // Guest list types array
  const [guestListTypes, setGuestListTypes] = useState([]);

  // For adding/editing guest list type
  const [showGuestListModal, setShowGuestListModal] = useState(false);
  const [editingGuestListIndex, setEditingGuestListIndex] = useState(null);
  const [guestListForm, setGuestListForm] = useState({
    name: '',
    description: '',
    max_capacity: '',
    allowed_gender: '', // '', 'male', 'female'
    is_active: true,
  });

  // Currency helper
  const getCurrencySymbol = () => {
    const currency = selectedVenue?.currency || 'GTQ';
    const symbols = { GTQ: 'Q', USD: '$', EUR: '€', MXN: '$' };
    return symbols[currency] || currency;
  };

  // Open date picker with current value
  const openDatePicker = () => {
    setTempDate(formData.event_date ? new Date(formData.event_date) : new Date());
    setShowDatePicker(true);
  };

  // Open start time picker with current value
  const openStartTimePicker = () => {
    const date = new Date();
    if (formData.start_time) {
      const [hours, minutes] = formData.start_time.split(':');
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
      date.setHours(21, 0, 0, 0); // Default to 21:00
    }
    // Set state synchronously before showing picker
    setTempStartTime(date);
    // Use setTimeout to ensure state is updated before modal opens
    setTimeout(() => setShowStartTimePicker(true), 50);
  };

  // Open end time picker with current value
  const openEndTimePicker = () => {
    const date = new Date();
    if (formData.end_time) {
      const [hours, minutes] = formData.end_time.split(':');
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
      date.setHours(3, 0, 0, 0); // Default to 03:00
    }
    // Set state synchronously before showing picker
    setTempEndTime(date);
    // Use setTimeout to ensure state is updated before modal opens
    setTimeout(() => setShowEndTimePicker(true), 50);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const formatted = selectedDate.toISOString().split('T')[0];
        setFormData({ ...formData, event_date: formatted });
      }
    } else {
      // iOS - just update temp value, don't close
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmDateSelection = () => {
    const formatted = tempDate.toISOString().split('T')[0];
    setFormData({ ...formData, event_date: formatted });
    setShowDatePicker(false);
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const hours = selectedTime.getHours().toString().padStart(2, '0');
        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
        setFormData({ ...formData, start_time: `${hours}:${minutes}:00` });
      }
    } else {
      // iOS - just update temp value
      if (selectedTime) {
        setTempStartTime(selectedTime);
      }
    }
  };

  const confirmStartTimeSelection = () => {
    const hours = tempStartTime.getHours().toString().padStart(2, '0');
    const minutes = tempStartTime.getMinutes().toString().padStart(2, '0');
    setFormData({ ...formData, start_time: `${hours}:${minutes}:00` });
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const hours = selectedTime.getHours().toString().padStart(2, '0');
        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
        setFormData({ ...formData, end_time: `${hours}:${minutes}:00` });
      }
    } else {
      // iOS - just update temp value
      if (selectedTime) {
        setTempEndTime(selectedTime);
      }
    }
  };

  const confirmEndTimeSelection = () => {
    const hours = tempEndTime.getHours().toString().padStart(2, '0');
    const minutes = tempEndTime.getMinutes().toString().padStart(2, '0');
    setFormData({ ...formData, end_time: `${hours}:${minutes}:00` });
    setShowEndTimePicker(false);
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!formData.name || !formData.event_date || !formData.start_time || !formData.end_time) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Date, Start Time, End Time)');
      return false;
    }
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an event image. This is required.');
      return false;
    }
    if (!formData.description) {
      Alert.alert('Error', 'Please enter an event description.');
      return false;
    }
    // Only require ticket_limit for non-VIP venues (VIP venues set it in Step 2 as "Available Spots")
    if (!useVipListFlow && !formData.ticket_limit) {
      Alert.alert('Error', 'Please enter the ticket limit.');
      return false;
    }
    if (!formData.min_age) {
      Alert.alert('Error', 'Please enter the minimum age.');
      return false;
    }
    if (!formData.dress_code) {
      Alert.alert('Error', 'Please enter the dress code.');
      return false;
    }
    return true;
  };

  // Go to step 2
  const goToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Go back to step 1
  const goToStep1 = () => {
    setCurrentStep(1);
  };

  // Go to step 3 (or submit for VIP venues)
  const goToStep3 = () => {
    // VIP List venues: validate and submit directly (no guest lists step)
    if (useVipListFlow) {
      // Validate people capacity if not unlimited
      if (!vipCapacity.isUnlimited) {
        const total = parseInt(vipCapacity.totalCapacity) || 0;
        if (total <= 0) {
          Alert.alert('Error', 'Ingresa la capacidad total de personas, o activa capacidad ilimitada');
          return;
        }
      }

      // Validate table count (always required)
      const tableCount = parseInt(vipCapacity.tableCount) || 0;
      if (tableCount <= 0) {
        Alert.alert('Error', 'Ingresa el número de mesas disponibles');
        return;
      }

      // Validate at least one VIP ticket type
      if (vipTicketTypes.length === 0) {
        Alert.alert('Error', 'Debes agregar al menos un tipo de ticket');
        return;
      }

      // VIP venues skip guest lists and submit directly
      handleSubmit();
      return;
    }

    // Regular flow: need at least one ticket type
    if (ticketTypes.length === 0) {
      Alert.alert('Error', 'You must add at least one ticket type');
      return;
    }
    setCurrentStep(3);
  };

  // Go back to step 2
  const goToStep2FromStep3 = () => {
    setCurrentStep(2);
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select an event image.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageAsset = result.assets[0];

        // Validate image
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

  // Remove selected image
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

  // Open modal for new ticket type
  const openAddTicketModal = () => {
    setEditingTicketIndex(null);
    setTicketForm({
      name: '',
      price: '',
      quantity: '',
      benefits: '',
      is_group: false,
      min_quantity: '',
      max_quantity: '',
      has_gender_pricing: false,
      male_price: '',
      female_price: '',
    });
    setShowTicketModal(true);
  };

  // Open modal for editing ticket type
  const openEditTicketModal = (index) => {
    const ticket = ticketTypes[index];
    setEditingTicketIndex(index);
    setTicketForm({
      name: ticket.name,
      price: ticket.price.toString(),
      quantity: ticket.quantity.toString(),
      benefits: ticket.benefits || '',
      is_group: ticket.is_group || false,
      min_quantity: ticket.min_quantity?.toString() || '',
      max_quantity: ticket.max_quantity?.toString() || '',
      has_gender_pricing: ticket.has_gender_pricing || false,
      male_price: ticket.male_price?.toString() || '',
      female_price: ticket.female_price?.toString() || '',
    });
    setShowTicketModal(true);
  };

  // Save ticket type
  const saveTicketType = () => {
    if (!ticketForm.name || !ticketForm.price || !ticketForm.quantity) {
      Alert.alert('Error', 'Name, Price, and Quantity are required');
      return;
    }

    const newTicket = {
      name: ticketForm.name,
      price: parseFloat(ticketForm.price),
      quantity: parseInt(ticketForm.quantity),
      benefits: ticketForm.benefits,
      is_group: ticketForm.is_group,
      min_quantity: ticketForm.is_group && ticketForm.min_quantity ? parseInt(ticketForm.min_quantity) : 1,
      max_quantity: ticketForm.is_group && ticketForm.max_quantity ? parseInt(ticketForm.max_quantity) : 1,
      has_gender_pricing: ticketForm.is_group && ticketForm.has_gender_pricing,
      male_price: ticketForm.has_gender_pricing && ticketForm.male_price ? parseFloat(ticketForm.male_price) : 0,
      female_price: ticketForm.has_gender_pricing && ticketForm.female_price ? parseFloat(ticketForm.female_price) : 0,
    };

    if (editingTicketIndex !== null) {
      // Update existing
      const updated = [...ticketTypes];
      updated[editingTicketIndex] = newTicket;
      setTicketTypes(updated);
    } else {
      // Add new
      setTicketTypes([...ticketTypes, newTicket]);
    }

    setShowTicketModal(false);
  };

  // Delete ticket type
  const deleteTicketType = (index) => {
    Alert.alert(
      'Delete Ticket Type',
      'Are you sure you want to delete this ticket type?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = ticketTypes.filter((_, i) => i !== index);
            setTicketTypes(updated);
          },
        },
      ]
    );
  };

  // =============================================================================
  // VIP TICKET TYPE FUNCTIONS
  // =============================================================================

  // Open modal for new VIP ticket type
  const openAddVipTicketModal = () => {
    setEditingVipTicketIndex(null);
    setVipTicketForm({
      name: '',
      male_price: '',
      female_price: '',
      min_quantity: '1',
      max_quantity: '20',
    });
    setShowVipTicketModal(true);
  };

  // Open modal for editing VIP ticket type
  const openEditVipTicketModal = (index) => {
    const ticket = vipTicketTypes[index];
    setEditingVipTicketIndex(index);
    setVipTicketForm({
      name: ticket.name,
      male_price: ticket.male_price.toString(),
      female_price: ticket.female_price.toString(),
      min_quantity: ticket.min_quantity.toString(),
      max_quantity: ticket.max_quantity.toString(),
    });
    setShowVipTicketModal(true);
  };

  // Save VIP ticket type
  const saveVipTicketType = () => {
    if (!vipTicketForm.name) {
      Alert.alert('Error', 'El nombre del tipo de ticket es requerido');
      return;
    }
    if (!vipTicketForm.male_price || !vipTicketForm.female_price) {
      Alert.alert('Error', 'Los precios para hombres y mujeres son requeridos');
      return;
    }
    if (!vipTicketForm.min_quantity || !vipTicketForm.max_quantity) {
      Alert.alert('Error', 'El mínimo y máximo de personas son requeridos');
      return;
    }

    const newTicket = {
      name: vipTicketForm.name,
      male_price: parseFloat(vipTicketForm.male_price),
      female_price: parseFloat(vipTicketForm.female_price),
      min_quantity: parseInt(vipTicketForm.min_quantity) || 1,
      max_quantity: parseInt(vipTicketForm.max_quantity) || 20,
    };

    if (editingVipTicketIndex !== null) {
      // Update existing
      const updated = [...vipTicketTypes];
      updated[editingVipTicketIndex] = newTicket;
      setVipTicketTypes(updated);
    } else {
      // Add new
      setVipTicketTypes([...vipTicketTypes, newTicket]);
    }

    setShowVipTicketModal(false);
  };

  // Delete VIP ticket type
  const deleteVipTicketType = (index) => {
    Alert.alert(
      'Eliminar Tipo de Ticket',
      '¿Estás seguro de que deseas eliminar este tipo de ticket?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = vipTicketTypes.filter((_, i) => i !== index);
            setVipTicketTypes(updated);
          },
        },
      ]
    );
  };

  // Validate people capacity
  const isCapacityValid = () => {
    if (vipCapacity.isUnlimited) return true;
    const total = parseInt(vipCapacity.totalCapacity) || 0;
    return total > 0;
  };

  // Validate table count (always required)
  const isTableCountValid = () => {
    const tableCount = parseInt(vipCapacity.tableCount) || 0;
    return tableCount > 0;
  };

  // =============================================================================
  // GUEST LIST TYPE FUNCTIONS
  // =============================================================================

  // Open modal for new guest list type
  const openAddGuestListModal = () => {
    setEditingGuestListIndex(null);
    setGuestListForm({
      name: '',
      description: '',
      max_capacity: '',
      allowed_gender: '',
      is_active: true,
    });
    setShowGuestListModal(true);
  };

  // Open modal for editing guest list type
  const openEditGuestListModal = (index) => {
    const guestList = guestListTypes[index];
    setEditingGuestListIndex(index);
    setGuestListForm({
      name: guestList.name,
      description: guestList.description || '',
      max_capacity: guestList.max_capacity?.toString() || '',
      allowed_gender: guestList.allowed_gender || '',
      is_active: guestList.is_active !== false,
    });
    setShowGuestListModal(true);
  };

  // Save guest list type
  const saveGuestListType = () => {
    if (!guestListForm.name) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!guestListForm.description) {
      Alert.alert('Error', 'Description is required');
      return;
    }
    if (!guestListForm.max_capacity) {
      Alert.alert('Error', 'Max Capacity is required');
      return;
    }

    const newGuestList = {
      name: guestListForm.name,
      description: guestListForm.description,
      max_capacity: guestListForm.max_capacity ? parseInt(guestListForm.max_capacity) : null,
      allowed_gender: guestListForm.allowed_gender || null,
      is_active: guestListForm.is_active,
    };

    if (editingGuestListIndex !== null) {
      // Update existing
      const updated = [...guestListTypes];
      updated[editingGuestListIndex] = newGuestList;
      setGuestListTypes(updated);
    } else {
      // Add new
      setGuestListTypes([...guestListTypes, newGuestList]);
    }

    setShowGuestListModal(false);
  };

  // Delete guest list type
  const deleteGuestListType = (index) => {
    Alert.alert(
      'Delete Guest List',
      'Are you sure you want to delete this guest list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = guestListTypes.filter((_, i) => i !== index);
            setGuestListTypes(updated);
          },
        },
      ]
    );
  };

  // Final submit
  const handleSubmit = async () => {
    // VIP venues use vipTicketTypes, regular venues use ticketTypes
    if (useVipListFlow) {
      // Validate people capacity if not unlimited
      if (!vipCapacity.isUnlimited) {
        const total = parseInt(vipCapacity.totalCapacity) || 0;
        if (total <= 0) {
          Alert.alert('Error', 'Ingresa la capacidad total de personas, o activa capacidad ilimitada');
          return;
        }
      }

      // Validate table count (always required)
      const tableCount = parseInt(vipCapacity.tableCount) || 0;
      if (tableCount <= 0) {
        Alert.alert('Error', 'Ingresa el número de mesas disponibles');
        return;
      }

      // Validate at least one VIP ticket type
      if (vipTicketTypes.length === 0) {
        Alert.alert('Error', 'Debes agregar al menos un tipo de ticket');
        return;
      }
    } else {
      if (ticketTypes.length === 0) {
        Alert.alert('Error', 'You must add at least one ticket type');
        return;
      }
    }

    if (!selectedImage) {
      Alert.alert('Error', 'Please select an event image');
      return;
    }

    setIsSubmitting(true);
    setIsUploadingImage(true);

    try {
      // Step 1: Upload the image first
      const uploadResult = await uploadService.uploadEventImage(selectedImage.uri);

      if (!uploadResult.success) {
        Alert.alert('Upload Error', uploadResult.error || 'Failed to upload image');
        setIsSubmitting(false);
        setIsUploadingImage(false);
        return;
      }

      setIsUploadingImage(false);

      // Step 2: Create event with the uploaded image URL
      // For VIP List venues, convert vipTicketTypes to the format expected by the API
      let finalTicketTypes = ticketTypes;
      if (useVipListFlow) {
        // For VIP venues, ticket quantity uses the capacity or 999999 if unlimited
        const ticketQuantity = vipCapacity.isUnlimited ? 999999 : (parseInt(vipCapacity.totalCapacity) || 999999);

        // Convert VIP ticket types to regular ticket types format
        finalTicketTypes = vipTicketTypes.map((vipTicket, index) => ({
          name: vipTicket.name,
          price: 0, // Base price is 0, actual prices are in male_price/female_price
          quantity: ticketQuantity,
          benefits: 'Per Person Consumibles',
          is_group: true,
          min_quantity: vipTicket.min_quantity,
          max_quantity: vipTicket.max_quantity,
          has_gender_pricing: true,
          male_price: vipTicket.male_price,
          female_price: vipTicket.female_price,
          sort_order: index,
        }));
      }

      // ticket_limit: 0 = unlimited, >0 = limited number of people
      // For VIP venues, use vipCapacity. For non-VIP, use formData
      const ticketLimitValue = useVipListFlow
        ? (vipCapacity.isUnlimited ? 0 : (parseInt(vipCapacity.totalCapacity) || 0))
        : (formData.ticket_limit ? parseInt(formData.ticket_limit) : 0);

      // Build the payload
      const payload = {
        name: formData.name,
        description: formData.description,
        image: uploadResult.data.url,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        ticket_limit: ticketLimitValue,
        dress_code: formData.dress_code,
        min_age: formData.min_age ? parseInt(formData.min_age) : 18,
        custom_location: formData.custom_location,
        ticket_types: finalTicketTypes,
      };

      // Add VIP-specific fields: table_capacity (number of physical tables, always required)
      if (useVipListFlow) {
        const tableCount = parseInt(vipCapacity.tableCount) || 0;
        payload.table_capacity = tableCount;
      }

      const result = await eventService.createEventWithTickets(payload);

      if (result.success) {
        // Step 3: Create guest list types if any
        if (guestListTypes.length > 0 && result.data?.event_id) {
          setIsCreatingGuestLists(true);
          const eventId = result.data.event_id;

          let guestListErrors = [];
          for (const guestList of guestListTypes) {
            const glResult = await guestListService.createGuestListType({
              event_id: eventId,
              name: guestList.name,
              description: guestList.description,
              max_capacity: guestList.max_capacity,
              allowed_gender: guestList.allowed_gender,
              is_active: guestList.is_active,
            });

            if (!glResult.success) {
              guestListErrors.push(guestList.name);
            }
          }

          setIsCreatingGuestLists(false);

          if (guestListErrors.length > 0) {
            Alert.alert(
              'Partial Success',
              `Event created but some guest lists failed: ${guestListErrors.join(', ')}`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } else {
            Alert.alert('Success', 'Event created with ticket types and guest lists!', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          }
        } else {
          Alert.alert('Success', 'Event created successfully with ticket types!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to create event');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
      setIsCreatingGuestLists(false);
    }
  };

  // Get step title and subtitle
  const getStepInfo = () => {
    // VIP venues only have 2 steps (no guest lists)
    if (useVipListFlow) {
      switch (currentStep) {
        case 1:
          return { icon: 'calendar', title: 'New Event', subtitle: 'Step 1 of 2: Event Details' };
        case 2:
          return { icon: 'cash', title: 'VIP Pricing', subtitle: 'Step 2 of 2: Set gender-based pricing' };
        default:
          return { icon: 'calendar', title: 'New Event', subtitle: 'Fill in the details below' };
      }
    }

    // Regular venues have 3 steps
    switch (currentStep) {
      case 1:
        return { icon: 'calendar', title: 'New Event', subtitle: 'Step 1: Event Details' };
      case 2:
        return { icon: 'ticket', title: 'Ticket Types', subtitle: 'Step 2: Add tickets for your event' };
      case 3:
        return { icon: 'list', title: 'Guest Lists', subtitle: 'Step 3: Optional free entry lists' };
      default:
        return { icon: 'calendar', title: 'New Event', subtitle: 'Fill in the details below' };
    }
  };

  const stepInfo = getStepInfo();

  // Render Step 1 - Event Details
  const renderStep1 = () => (
    <View style={styles.form}>
      {/* Event Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Event Name <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="text-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Summer Night Party"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.inputSimple, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Enter event description..."
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Event Image Picker */}
      <View style={styles.field}>
        <Text style={styles.label}>Event Image <Text style={styles.required}>*</Text></Text>

        {selectedImage ? (
          // Image Preview
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Image Picker Button
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.imagePickerContent}>
              <View style={styles.imagePickerIconCircle}>
                <Ionicons name="image-outline" size={32} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.imagePickerTitle}>Select Event Image</Text>
              <Text style={styles.imagePickerSubtitle}>Tap to choose from gallery</Text>
              <Text style={styles.imagePickerHint}>JPEG, PNG or WebP - Max 10MB</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Event Date */}
      <View style={styles.field}>
        <Text style={styles.label}>Event Date <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity style={styles.dateButton} onPress={openDatePicker}>
          <Ionicons name="calendar-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
          <Text style={[styles.dateButtonText, !formData.event_date && styles.placeholder]}>
            {formData.event_date || 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Section */}
      <View style={styles.timeRow}>
        {/* Start Time */}
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Start Time <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.dateButton} onPress={openStartTimePicker}>
            <Ionicons name="time-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
            <Text style={[styles.dateButtonText, !formData.start_time && styles.placeholder]}>
              {formData.start_time ? formData.start_time.slice(0, 5) : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Time */}
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>End Time <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.dateButton} onPress={openEndTimePicker}>
            <Ionicons name="time-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
            <Text style={[styles.dateButtonText, !formData.end_time && styles.placeholder]}>
              {formData.end_time ? formData.end_time.slice(0, 5) : 'End'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal (iOS) / Inline (Android) */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Start Time Picker (Android) */}
      {showStartTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          key={`android-start-${tempStartTime.getTime()}`}
          value={tempStartTime}
          mode="time"
          display="spinner"
          is24Hour={true}
          onChange={handleStartTimeChange}
        />
      )}

      {/* End Time Picker (Android) */}
      {showEndTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          key={`android-end-${tempEndTime.getTime()}`}
          value={tempEndTime}
          mode="time"
          display="spinner"
          is24Hour={true}
          onChange={handleEndTimeChange}
        />
      )}

      {/* Ticket Limit - Only show for non-VIP venues (VIP venues set this in Step 2 as "Available Spots") */}
      {!useVipListFlow && (
        <View style={styles.field}>
          <Text style={styles.label}>Ticket Limit (Global) <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="people-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.ticket_limit}
              onChangeText={(text) => setFormData({ ...formData, ticket_limit: text })}
              placeholder="0 for unlimited"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Min Age */}
      <View style={styles.field}>
        <Text style={styles.label}>Minimum Age <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="warning-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.min_age}
            onChangeText={(text) => setFormData({ ...formData, min_age: text })}
            placeholder="18"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Dress Code */}
      <View style={styles.field}>
        <Text style={styles.label}>Dress Code <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="shirt-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.dress_code}
            onChangeText={(text) => setFormData({ ...formData, dress_code: text })}
            placeholder="e.g., Smart casual, Formal"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Custom Location */}
      <View style={styles.field}>
        <Text style={styles.label}>Custom Location</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.custom_location}
            onChangeText={(text) => setFormData({ ...formData, custom_location: text })}
            placeholder="Optional: Override venue location"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.cancelButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.cancelButtonInner}>
              <Ionicons name="close" size={18} color="rgb(239, 68, 68)" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToStep2} activeOpacity={0.8} style={styles.submitButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.submitButtonInner}>
              <Text style={styles.submitButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Step 2 - Ticket Types (Regular flow)
  const renderStep2 = () => (
    <View style={styles.form}>
      {/* List of ticket types */}
      {ticketTypes.map((ticket, index) => (
        <View key={index} style={styles.ticketTypeItem}>
          <View style={styles.ticketTypeContent}>
            <View style={styles.ticketTypeHeader}>
              <Text style={styles.ticketTypeName}>{ticket.name}</Text>
              <View style={styles.ticketTypeActions}>
                <TouchableOpacity onPress={() => openEditTicketModal(index)} style={styles.ticketTypeActionBtn}>
                  <Ionicons name="pencil" size={18} color="rgb(168, 85, 255)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTicketType(index)} style={styles.ticketTypeActionBtn}>
                  <Ionicons name="trash" size={18} color="rgb(239, 68, 68)" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.ticketTypeDetails}>
              <Text style={styles.ticketTypePrice}>
                {getCurrencySymbol()}{ticket.price.toFixed(2)}
              </Text>
              <Text style={styles.ticketTypeQty}>Qty: {ticket.quantity}</Text>
              {ticket.is_group && (
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>Group</Text>
                </View>
              )}
            </View>
            {ticket.has_gender_pricing && (
              <View style={styles.genderPrices}>
                <Text style={styles.genderPriceText}>
                  Male: {getCurrencySymbol()}{ticket.male_price?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.genderPriceText}>
                  Female: {getCurrencySymbol()}{ticket.female_price?.toFixed(2) || '0.00'}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Add Ticket Type Button */}
      <TouchableOpacity onPress={openAddTicketModal} activeOpacity={0.8} style={styles.addButton}>
        <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
          <View style={styles.addButtonInner}>
            <Ionicons name="add-circle-outline" size={20} color="rgb(168, 85, 255)" />
            <Text style={styles.addButtonText}>Add Ticket Type</Text>
          </View>
        </BlurView>
      </TouchableOpacity>

      {/* Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={goToStep1} activeOpacity={0.8} style={styles.cancelButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToStep3}
          activeOpacity={0.8}
          style={[styles.submitButton, ticketTypes.length === 0 && styles.buttonDisabled]}
          disabled={ticketTypes.length === 0}
        >
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.submitButtonInner}>
              <Text style={styles.submitButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Step 2 - VIP List Venues (Capacity + Multiple Ticket Types)
  const renderStep2VIP = () => {
    // Form validation
    const capacityOk = isCapacityValid();
    const tablesOk = isTableCountValid();
    const hasTicketTypes = vipTicketTypes.length > 0;
    const isFormValid = capacityOk && tablesOk && hasTicketTypes;

    return (
      <View style={styles.form}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color="rgb(168, 85, 255)" />
            <Text style={styles.infoText}>Configura la <Text style={styles.infoHighlight}>capacidad</Text>, <Text style={styles.infoHighlight}>mesas</Text> y <Text style={styles.infoHighlight}>tipos de tickets</Text></Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color="rgb(168, 85, 255)" />
            <Text style={styles.infoText}>Cada reserva de mesa consume personas + 1 mesa</Text>
          </View>
        </View>

        {/* ======= PEOPLE CAPACITY SECTION ======= */}
        <View style={styles.vipSectionHeader}>
          <Ionicons name="people" size={20} color="rgb(168, 85, 255)" />
          <Text style={styles.vipSectionTitle}>Capacidad de Personas</Text>
        </View>

        {/* Unlimited People Toggle */}
        <View style={styles.unlimitedToggleRow}>
          <View style={styles.unlimitedToggleInfo}>
            <Ionicons name="infinite-outline" size={20} color={vipCapacity.isUnlimited ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.4)'} />
            <Text style={[styles.unlimitedToggleText, vipCapacity.isUnlimited && styles.unlimitedToggleTextActive]}>
              Capacidad Ilimitada
            </Text>
          </View>
          <Switch
            value={vipCapacity.isUnlimited}
            onValueChange={(value) => setVipCapacity({ ...vipCapacity, isUnlimited: value, totalCapacity: '' })}
            trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(168, 85, 255, 0.4)' }}
            thumbColor={vipCapacity.isUnlimited ? 'rgb(168, 85, 255)' : '#f4f3f4'}
          />
        </View>

        {/* Total Capacity - Only show if not unlimited */}
        {!vipCapacity.isUnlimited && (
          <View style={styles.capacityDistributionContainer}>
            <View style={styles.field}>
              <Text style={styles.label}>Capacidad Total <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="people-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={vipCapacity.totalCapacity}
                  onChangeText={(text) => setVipCapacity({ ...vipCapacity, totalCapacity: text })}
                  placeholder="ej: 100"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {parseInt(vipCapacity.totalCapacity) > 0 && (
              <View style={styles.capacitySummary}>
                <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />
                <Text style={styles.capacitySummaryLabel}> Máximo {vipCapacity.totalCapacity} personas</Text>
              </View>
            )}
          </View>
        )}

        {/* ======= TABLE COUNT SECTION ======= */}
        <View style={[styles.vipSectionHeader, { marginTop: 24 }]}>
          <Ionicons name="grid" size={20} color="rgb(168, 85, 255)" />
          <Text style={styles.vipSectionTitle}>Número de Mesas</Text>
        </View>

        {/* Table Count - Always required */}
        <View style={styles.capacityDistributionContainer}>
          <View style={styles.field}>
            <Text style={styles.label}>Número de Mesas <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="grid-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={vipCapacity.tableCount}
                onChangeText={(text) => setVipCapacity({ ...vipCapacity, tableCount: text })}
                placeholder="ej: 10"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                keyboardType="number-pad"
              />
            </View>
          </View>
          {parseInt(vipCapacity.tableCount) > 0 && (
            <View style={styles.capacitySummary}>
              <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />
              <Text style={styles.capacitySummaryLabel}> {vipCapacity.tableCount} mesas disponibles</Text>
            </View>
          )}
        </View>

        {/* ======= TICKET TYPES SECTION ======= */}
        <View style={[styles.vipSectionHeader, { marginTop: 24 }]}>
          <Ionicons name="ticket" size={20} color="rgb(168, 85, 255)" />
          <Text style={styles.vipSectionTitle}>Tipos de Tickets</Text>
        </View>

        {/* List of VIP ticket types */}
        {vipTicketTypes.map((ticket, index) => (
          <View key={index} style={styles.vipTicketTypeItem}>
            <View style={styles.vipTicketTypeContent}>
              <View style={styles.vipTicketTypeHeader}>
                <Text style={styles.vipTicketTypeName}>{ticket.name}</Text>
                <View style={styles.ticketTypeActions}>
                  <TouchableOpacity onPress={() => openEditVipTicketModal(index)} style={styles.ticketTypeActionBtn}>
                    <Ionicons name="pencil" size={18} color="rgb(168, 85, 255)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteVipTicketType(index)} style={styles.ticketTypeActionBtn}>
                    <Ionicons name="trash" size={18} color="rgb(239, 68, 68)" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.vipTicketTypePrices}>
                <View style={styles.vipPriceTag}>
                  <Ionicons name="male" size={14} color="rgb(59, 130, 246)" />
                  <Text style={styles.vipPriceTagText}>{getCurrencySymbol()}{ticket.male_price.toFixed(2)}</Text>
                </View>
                <View style={styles.vipPriceTag}>
                  <Ionicons name="female" size={14} color="rgb(236, 72, 153)" />
                  <Text style={styles.vipPriceTagText}>{getCurrencySymbol()}{ticket.female_price.toFixed(2)}</Text>
                </View>
                <View style={styles.vipGroupTag}>
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.vipGroupTagText}>{ticket.min_quantity}-{ticket.max_quantity} pers.</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Add Ticket Type Button */}
        <TouchableOpacity onPress={openAddVipTicketModal} activeOpacity={0.8} style={styles.addButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.addButtonInner}>
              <Ionicons name="add-circle-outline" size={20} color="rgb(168, 85, 255)" />
              <Text style={styles.addButtonText}>Agregar Tipo de Ticket</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Help text if no tickets */}
        {vipTicketTypes.length === 0 && (
          <View style={styles.noTicketsHint}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.noTicketsHintText}>Agrega al menos un tipo de ticket para continuar</Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity onPress={goToStep1} activeOpacity={0.8} style={styles.cancelButton}>
            <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.backButtonText}>Atrás</Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToStep3}
            activeOpacity={0.8}
            style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.buttonDisabled]}
            disabled={!isFormValid || isSubmitting}
          >
            <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
              <View style={styles.submitButtonInner}>
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.submitButtonText}>
                      {isUploadingImage ? 'Subiendo...' : 'Creando...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="white" />
                    <Text style={styles.submitButtonText}>Create Event</Text>
                  </>
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Step 3 - Guest Lists
  const renderStep3 = () => (
    <View style={styles.form}>
      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={18} color="rgb(168, 85, 255)" />
          <Text style={styles.infoText}>Guest lists are <Text style={styles.infoHighlight}>optional</Text> free entry lists</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color="rgb(168, 85, 255)" />
          <Text style={styles.infoText}>Users sign up and staff approves them</Text>
        </View>
      </View>

      {/* List of guest list types */}
      {guestListTypes.map((guestList, index) => (
        <View key={index} style={styles.ticketTypeItem}>
          <View style={styles.ticketTypeContent}>
            <View style={styles.ticketTypeHeader}>
              <Text style={styles.ticketTypeName}>{guestList.name}</Text>
              <View style={styles.ticketTypeActions}>
                <TouchableOpacity onPress={() => openEditGuestListModal(index)} style={styles.ticketTypeActionBtn}>
                  <Ionicons name="pencil" size={18} color="rgb(168, 85, 255)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGuestListType(index)} style={styles.ticketTypeActionBtn}>
                  <Ionicons name="trash" size={18} color="rgb(239, 68, 68)" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.ticketTypeDetails}>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
              {guestList.max_capacity && (
                <Text style={styles.ticketTypeQty}>Capacity: {guestList.max_capacity}</Text>
              )}
              {guestList.allowed_gender && (
                <View style={styles.genderBadge}>
                  <Ionicons
                    name={guestList.allowed_gender === 'male' ? 'male' : 'female'}
                    size={14}
                    color={guestList.allowed_gender === 'male' ? 'rgb(59, 130, 246)' : 'rgb(236, 72, 153)'}
                  />
                  <Text style={[
                    styles.genderBadgeText,
                    { color: guestList.allowed_gender === 'male' ? 'rgb(59, 130, 246)' : 'rgb(236, 72, 153)' }
                  ]}>
                    {guestList.allowed_gender === 'male' ? 'Men Only' : 'Women Only'}
                  </Text>
                </View>
              )}
            </View>
            {guestList.description && (
              <Text style={styles.guestListDescription} numberOfLines={2}>
                {guestList.description}
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* Add Guest List Button */}
      <TouchableOpacity onPress={openAddGuestListModal} activeOpacity={0.8} style={styles.addButton}>
        <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
          <View style={styles.addButtonInnerGreen}>
            <Ionicons name="add-circle-outline" size={20} color="rgb(52, 211, 153)" />
            <Text style={styles.addButtonTextGreen}>Add Guest List</Text>
          </View>
        </BlurView>
      </TouchableOpacity>

      {/* Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={goToStep2FromStep3} activeOpacity={0.8} style={styles.cancelButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.8} style={styles.submitButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.submitButtonInner}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>
                    {isUploadingImage ? 'Uploading...' : isCreatingGuestLists ? 'Creating...' : 'Creating...'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={styles.submitButtonText}>Create Event</Text>
                </>
              )}
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Ticket Type Modal
  const renderTicketModal = () => (
    <Modal visible={showTicketModal} animationType="slide" transparent={true} onRequestClose={() => setShowTicketModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTicketIndex !== null ? 'Edit Ticket Type' : 'New Ticket Type'}
                </Text>
                <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                  <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Ticket Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="ticket-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={ticketForm.name}
                      onChangeText={(text) => setTicketForm({ ...ticketForm, name: text })}
                      placeholder="e.g., General Admission, VIP"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    />
                  </View>
                </View>

                {/* Price */}
                <View style={styles.field}>
                  <Text style={styles.label}>Price ({getCurrencySymbol()}) <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="cash-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={ticketForm.price}
                      onChangeText={(text) => setTicketForm({ ...ticketForm, price: text })}
                      placeholder="0.00"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Quantity */}
                <View style={styles.field}>
                  <Text style={styles.label}>Available Quantity <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="layers-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={ticketForm.quantity}
                      onChangeText={(text) => setTicketForm({ ...ticketForm, quantity: text })}
                      placeholder="100"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Benefits */}
                <View style={styles.field}>
                  <Text style={styles.label}>Benefits <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.inputSimple, styles.textArea]}
                    value={ticketForm.benefits}
                    onChangeText={(text) => setTicketForm({ ...ticketForm, benefits: text })}
                    placeholder="e.g., Free drink, Priority entry..."
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Is Group Toggle */}
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.label}>Group Ticket</Text>
                    <Text style={styles.switchDescription}>For groups (e.g., tables, VIP sections)</Text>
                  </View>
                  <Switch
                    value={ticketForm.is_group}
                    onValueChange={(value) => setTicketForm({ ...ticketForm, is_group: value, has_gender_pricing: false })}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 255, 0.5)' }}
                    thumbColor={ticketForm.is_group ? 'rgb(168, 85, 255)' : '#f4f3f4'}
                  />
                </View>

                {/* Group Options */}
                {ticketForm.is_group && (
                  <>
                    <View style={styles.timeRow}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Min People <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={ticketForm.min_quantity}
                            onChangeText={(text) => setTicketForm({ ...ticketForm, min_quantity: text })}
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
                            value={ticketForm.max_quantity}
                            onChangeText={(text) => setTicketForm({ ...ticketForm, max_quantity: text })}
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
                        <Text style={styles.switchDescription}>Different prices for male/female</Text>
                      </View>
                      <Switch
                        value={ticketForm.has_gender_pricing}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, has_gender_pricing: value })}
                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 255, 0.5)' }}
                        thumbColor={ticketForm.has_gender_pricing ? 'rgb(168, 85, 255)' : '#f4f3f4'}
                      />
                    </View>

                    {/* Gender Prices */}
                    {ticketForm.has_gender_pricing && (
                      <View style={styles.timeRow}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>Male Price <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="male-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              value={ticketForm.male_price}
                              onChangeText={(text) => setTicketForm({ ...ticketForm, male_price: text })}
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
                              value={ticketForm.female_price}
                              onChangeText={(text) => setTicketForm({ ...ticketForm, female_price: text })}
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

                {/* Save Button */}
                <TouchableOpacity onPress={saveTicketType} activeOpacity={0.8} style={[styles.submitButton, { marginTop: 20 }]}>
                  <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                    <View style={styles.submitButtonInner}>
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text style={styles.submitButtonText}>
                        {editingTicketIndex !== null ? 'Update' : 'Add Ticket'}
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <BackgroundGlow>
      {/* Custom Header */}
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
                <Ionicons name={stepInfo.icon} size={28} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.headerTitle}>{stepInfo.title}</Text>
              <Text style={styles.headerSubtitle}>{stepInfo.subtitle}</Text>
            </View>

            {/* Render Current Step */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && (useVipListFlow ? renderStep2VIP() : renderStep2())}
            {currentStep === 3 && renderStep3()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Ticket Type Modal */}
      {renderTicketModal()}

      {/* VIP Ticket Type Modal */}
      <Modal visible={showVipTicketModal} animationType="slide" transparent={true} onRequestClose={() => setShowVipTicketModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingVipTicketIndex !== null ? 'Editar Tipo de Ticket' : 'Nuevo Tipo de Ticket'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowVipTicketModal(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                  {/* Ticket Name */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="ticket-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={vipTicketForm.name}
                        onChangeText={(text) => setVipTicketForm({ ...vipTicketForm, name: text })}
                        placeholder="ej: VIP List Entry, Amigos, Conocidos"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      />
                    </View>
                  </View>

                  {/* Gender Prices */}
                  <View style={styles.timeRow}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>
                        <Ionicons name="male" size={14} color="rgb(59, 130, 246)" /> Precio Hombre <Text style={styles.required}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.currencyPrefix}>{getCurrencySymbol()}</Text>
                        <TextInput
                          style={[styles.input, { paddingLeft: 36 }]}
                          value={vipTicketForm.male_price}
                          onChangeText={(text) => setVipTicketForm({ ...vipTicketForm, male_price: text })}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>
                        <Ionicons name="female" size={14} color="rgb(236, 72, 153)" /> Precio Mujer <Text style={styles.required}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.currencyPrefix}>{getCurrencySymbol()}</Text>
                        <TextInput
                          style={[styles.input, { paddingLeft: 36 }]}
                          value={vipTicketForm.female_price}
                          onChangeText={(text) => setVipTicketForm({ ...vipTicketForm, female_price: text })}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Min/Max People per Group */}
                  <View style={styles.timeRow}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Mín. Personas <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="remove-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={vipTicketForm.min_quantity}
                          onChangeText={(text) => setVipTicketForm({ ...vipTicketForm, min_quantity: text })}
                          placeholder="1"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Máx. Personas <Text style={styles.required}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="add-circle-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={vipTicketForm.max_quantity}
                          onChangeText={(text) => setVipTicketForm({ ...vipTicketForm, max_quantity: text })}
                          placeholder="20"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity onPress={saveVipTicketType} activeOpacity={0.8} style={[styles.submitButton, { marginTop: 20 }]}>
                    <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                      <View style={styles.submitButtonInner}>
                        <Ionicons name="checkmark" size={18} color="white" />
                        <Text style={styles.submitButtonText}>
                          {editingVipTicketIndex !== null ? 'Actualizar' : 'Agregar Ticket'}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guest List Type Modal */}
      <Modal visible={showGuestListModal} animationType="slide" transparent={true} onRequestClose={() => setShowGuestListModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingGuestListIndex !== null ? 'Edit Guest List' : 'New Guest List'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowGuestListModal(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                  {/* Name */}
                  <View style={styles.field}>
                    <Text style={styles.label}>List Name <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="list-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={guestListForm.name}
                        onChangeText={(text) => setGuestListForm({ ...guestListForm, name: text })}
                        placeholder="e.g., General List, VIP List"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      />
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      style={[styles.inputSimple, styles.textArea]}
                      value={guestListForm.description}
                      onChangeText={(text) => setGuestListForm({ ...guestListForm, description: text })}
                      placeholder="Description for this list"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Max Capacity */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Max Capacity <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="people-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={guestListForm.max_capacity}
                        onChangeText={(text) => setGuestListForm({ ...guestListForm, max_capacity: text })}
                        placeholder="e.g., 100"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* Gender Restriction */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Gender Restriction <Text style={styles.required}>*</Text></Text>
                    <View style={styles.genderSelectorRow}>
                      <TouchableOpacity
                        style={[styles.genderOption, guestListForm.allowed_gender === '' && styles.genderOptionActive]}
                        onPress={() => setGuestListForm({ ...guestListForm, allowed_gender: '' })}
                      >
                        <Ionicons name="people" size={20} color={guestListForm.allowed_gender === '' ? 'white' : 'rgba(255,255,255,0.5)'} />
                        <Text style={[styles.genderOptionText, guestListForm.allowed_gender === '' && styles.genderOptionTextActive]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderOption, guestListForm.allowed_gender === 'male' && styles.genderOptionMale]}
                        onPress={() => setGuestListForm({ ...guestListForm, allowed_gender: 'male' })}
                      >
                        <Ionicons name="male" size={20} color={guestListForm.allowed_gender === 'male' ? 'rgb(59, 130, 246)' : 'rgba(255,255,255,0.5)'} />
                        <Text style={[styles.genderOptionText, guestListForm.allowed_gender === 'male' && { color: 'rgb(59, 130, 246)' }]}>Men</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderOption, guestListForm.allowed_gender === 'female' && styles.genderOptionFemale]}
                        onPress={() => setGuestListForm({ ...guestListForm, allowed_gender: 'female' })}
                      >
                        <Ionicons name="female" size={20} color={guestListForm.allowed_gender === 'female' ? 'rgb(236, 72, 153)' : 'rgba(255,255,255,0.5)'} />
                        <Text style={[styles.genderOptionText, guestListForm.allowed_gender === 'female' && { color: 'rgb(236, 72, 153)' }]}>Women</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Active Toggle */}
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.label}>Active</Text>
                      <Text style={styles.switchDescription}>Users can sign up for this list</Text>
                    </View>
                    <Switch
                      value={guestListForm.is_active}
                      onValueChange={(value) => setGuestListForm({ ...guestListForm, is_active: value })}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(52, 211, 153, 0.5)' }}
                      thumbColor={guestListForm.is_active ? 'rgb(52, 211, 153)' : '#f4f3f4'}
                    />
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity onPress={saveGuestListType} activeOpacity={0.8} style={[styles.submitButton, { marginTop: 20 }]}>
                    <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                      <View style={styles.createButtonInner}>
                        <Ionicons name="checkmark" size={18} color="white" />
                        <Text style={styles.submitButtonText}>
                          {editingGuestListIndex !== null ? 'Update' : 'Add List'}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
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
        </Modal>
      )}

      {/* iOS Start Time Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showStartTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
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
                key={`start-time-${tempStartTime.getTime()}`}
                value={tempStartTime}
                mode="time"
                display="spinner"
                is24Hour={true}
                onChange={handleStartTimeChange}
                textColor="#ffffff"
                locale="es-ES"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS End Time Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showEndTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
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
                key={`end-time-${tempEndTime.getTime()}`}
                value={tempEndTime}
                mode="time"
                display="spinner"
                is24Hour={true}
                onChange={handleEndTimeChange}
                textColor="#ffffff"
                locale="es-ES"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 36,
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
  },

  // Form
  form: {
    gap: 20,
    marginBottom: 28,
  },
  field: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
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
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
  fieldError: {
    color: 'rgb(239, 68, 68)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },

  // Date/Time buttons
  dateButton: {
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
  dateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Info Section
  infoSection: {
    gap: 12,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  infoHighlight: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  cancelButtonText: {
    color: 'rgb(239, 68, 68)',
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
  backButtonInner: {
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
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  createButtonInner: {
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
  buttonDisabled: {
    opacity: 0.5,
  },

  // Add Button
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonInner: {
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
  addButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
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
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },

  // Image Picker
  imagePickerButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.3)',
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
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.5)',
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
    backgroundColor: 'rgba(168, 85, 255, 0.6)',
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

  // Ticket Type Items
  ticketTypeItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ticketTypeContent: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketTypeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketTypeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ticketTypeActionBtn: {
    padding: 4,
  },
  ticketTypeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ticketTypePrice: {
    color: 'rgb(168, 85, 255)',
    fontSize: 18,
    fontWeight: '700',
  },
  ticketTypeQty: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  groupBadge: {
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 12,
    fontWeight: '500',
  },
  genderPrices: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderPriceText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },

  // Guest List styles
  freeBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: 'rgb(52, 211, 153)',
    fontSize: 12,
    fontWeight: '700',
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  guestListDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  genderOptionActive: {
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderColor: 'rgba(168, 85, 255, 0.5)',
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: 'rgba(15, 15, 21, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 20,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  modalScroll: {
    flexGrow: 1,
  },

  // VIP List Ticket Form Styles
  currencyPrefix: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
  vipPreviewCard: {
    backgroundColor: 'rgba(168, 85, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.25)',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  vipPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  vipPreviewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  vipPreviewDetails: {
    gap: 4,
    marginBottom: 16,
  },
  vipPreviewText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  vipPreviewPrices: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  vipPriceBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vipPriceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  vipPreviewNote: {
    color: 'rgba(168, 85, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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

  // VIP Section Header
  vipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  vipSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Capacity Distribution
  capacityDistributionContainer: {
    marginTop: 12,
    gap: 12,
  },
  capacitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 12,
    flexWrap: 'wrap',
  },
  capacitySummaryError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  capacitySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacitySummaryLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  capacitySummaryValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  capacitySummaryValueError: {
    color: 'rgb(239, 68, 68)',
  },
  capacitySummaryPlus: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontWeight: '400',
  },
  capacitySummaryEquals: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 4,
  },
  capacitySummaryOf: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontWeight: '400',
  },
  capacitySummaryTotal: {
    color: 'rgb(168, 85, 255)',
    fontSize: 16,
    fontWeight: '700',
  },
  capacityRemainingBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  capacityRemainingText: {
    color: 'rgb(239, 68, 68)',
    fontSize: 12,
    fontWeight: '600',
  },

  // VIP Ticket Type Items
  vipTicketTypeItem: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  vipTicketTypeContent: {
    padding: 16,
    backgroundColor: 'rgba(168, 85, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.15)',
    borderRadius: 12,
  },
  vipTicketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vipTicketTypeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  vipTicketTypePrices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vipPriceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vipPriceTagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  vipGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vipGroupTagText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },

  // No tickets hint
  noTicketsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    opacity: 0.6,
  },
  noTicketsHintText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
});
