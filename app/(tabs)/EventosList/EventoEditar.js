// app/(tabs)/EventosList/EventoEditar.js - Edit Event Screen (Same design as EventoNuevo.js)
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
  SafeAreaView,
  Modal,
  Image,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '@/services/uploadService';

export default function EventoEditar() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { selectedVenue } = useDataStore();
  const { user } = useAuthStore();

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
    fetchEventDetail,
    updateEvent,
    isUpdatingEvent,
    deleteEvent,
    isDeletingEvent,
  } = useDataStore();

  // Check if this venue uses VIP List flow
  const useVipListFlow = user?.use_vip_list_flow || false;

  // Scroll tracking for navbar
  const scrollY = useRef(new Animated.Value(0)).current;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    isUnlimited: true, // People capacity unlimited
    totalCapacity: '', // Max people if not unlimited
    tableCount: '', // Number of physical tables (always required for VIP venues)
    dress_code: '',
    min_age: '18',
    custom_location: '',
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

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (params.id) {
        setIsLoading(true);
        await fetchEventDetail(params.id);
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [params.id]);

  // Populate form when event is loaded
  useEffect(() => {
    if (currentEvent) {
      // ticket_limit = 0 means unlimited people, >0 means limited
      const ticketLimit = currentEvent.ticket_limit || 0;
      const isUnlimitedPeople = ticketLimit === 0;
      // table_capacity is always required for VIP venues (number of physical tables)
      const tableCapacity = currentEvent.table_capacity || 0;
      setFormData({
        name: currentEvent.event_name || '',
        description: currentEvent.description || '',
        image: currentEvent.event_img || '',
        event_date: currentEvent.event_date || '',
        start_time: currentEvent.start_time || '',
        end_time: currentEvent.end_time || '',
        ticket_limit: isUnlimitedPeople ? '' : ticketLimit.toString(),
        isUnlimited: isUnlimitedPeople,
        totalCapacity: isUnlimitedPeople ? '' : ticketLimit.toString(),
        tableCount: tableCapacity > 0 ? tableCapacity.toString() : '',
        dress_code: currentEvent.dress_code || '',
        min_age: currentEvent.min_age?.toString() || '18',
        custom_location: currentEvent.custom_location || '',
      });
    }
  }, [currentEvent]);

  // Currency helper
  const getCurrencySymbol = () => {
    const currency = selectedVenue?.currency || 'GTQ';
    const symbols = { GTQ: 'Q', USD: '$', EUR: '€', MXN: '$' };
    return symbols[currency] || currency;
  };

  // VIP capacity validation
  const isCapacityValid = () => {
    if (formData.isUnlimited) return true;
    if (!useVipListFlow) return true;
    const total = parseInt(formData.totalCapacity) || 0;
    return total > 0;
  };

  // VIP table count validation (always required for VIP venues)
  const isTableCountValid = () => {
    if (!useVipListFlow) return true;
    const tableCount = parseInt(formData.tableCount) || 0;
    return tableCount > 0;
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

  // Validation
  const validateForm = () => {
    if (!formData.name || !formData.event_date || !formData.start_time || !formData.end_time) {
      Alert.alert('Error', 'Please complete all required fields (Name, Date, Start Time, End Time)');
      return false;
    }
    if (!formData.description) {
      Alert.alert('Error', 'Please enter an event description.');
      return false;
    }
    // VIP venues: validate capacity if not unlimited
    if (useVipListFlow && !formData.isUnlimited) {
      const total = parseInt(formData.totalCapacity) || 0;
      if (total <= 0) {
        Alert.alert('Error', 'Ingresa la capacidad de personas, o activa capacidad ilimitada');
        return false;
      }
    }
    // VIP venues: validate table count (always required)
    if (useVipListFlow) {
      const tableCount = parseInt(formData.tableCount) || 0;
      if (tableCount <= 0) {
        Alert.alert('Error', 'Ingresa el número de mesas disponibles');
        return false;
      }
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

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo gallery to select an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
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
      Alert.alert('Error', 'Error selecting image. Please try again.');
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

  // Submit changes
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setIsUploadingImage(true);

    try {
      let imageUrl = formData.image;

      // If a new image was selected, upload it first
      if (selectedImage) {
        const uploadResult = await uploadService.uploadEventImage(selectedImage.uri);

        if (!uploadResult.success) {
          Alert.alert('Upload Error', uploadResult.error || 'Error uploading image');
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        }

        imageUrl = uploadResult.data.url;
      }

      setIsUploadingImage(false);

      // ticket_limit: 0 = unlimited, >0 = max people
      const ticketLimitValue = useVipListFlow
        ? (formData.isUnlimited ? 0 : (parseInt(formData.totalCapacity) || 0))
        : (formData.ticket_limit ? parseInt(formData.ticket_limit) : 0);

      // Build update payload
      const updatePayload = {
        name: formData.name,
        description: formData.description,
        image: imageUrl,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        ticket_limit: ticketLimitValue,
        is_unlimited: formData.isUnlimited,
        dress_code: formData.dress_code,
        min_age: formData.min_age ? parseInt(formData.min_age) : 18,
        custom_location: formData.custom_location,
      };

      // Add VIP table count - always send if there's a value
      const tableCount = parseInt(formData.tableCount) || 0;
      if (tableCount > 0 || useVipListFlow) {
        updatePayload.table_capacity = tableCount;
      }

      const result = await updateEvent(params.id, updatePayload);

      if (result.success) {
        Alert.alert('Success', 'Event updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Error updating event');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  // Delete event
  const handleDelete = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEvent(params.id);

            if (result.success) {
              Alert.alert('Success', 'Event deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Error deleting event');
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
            <Text style={styles.loadingText}>Loading event...</Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  // Render Event Form
  const renderForm = () => (
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
            placeholder="e.g., Summer Night"
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
        ) : formData.image ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: formData.image }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.imagePickerContent}>
              <View style={styles.imagePickerIconCircle}>
                <Ionicons name="image-outline" size={32} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.imagePickerTitle}>Select Image</Text>
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

      {/* Date Picker (Android) */}
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

      {/* VIP Venues: Capacity + Table Count Configuration */}
      {useVipListFlow && (
        <>
          {/* People Capacity Section */}
          <View style={styles.field}>
            <Text style={styles.label}>Capacidad de Personas</Text>

            <View style={styles.unlimitedToggleRow}>
              <View style={styles.unlimitedToggleInfo}>
                <Ionicons name="infinite-outline" size={20} color={formData.isUnlimited ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.4)'} />
                <Text style={[styles.unlimitedToggleText, formData.isUnlimited && styles.unlimitedToggleTextActive]}>
                  Capacidad Ilimitada
                </Text>
              </View>
              <Switch
                value={formData.isUnlimited}
                onValueChange={(value) => setFormData({ ...formData, isUnlimited: value, totalCapacity: '' })}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(168, 85, 255, 0.4)' }}
                thumbColor={formData.isUnlimited ? 'rgb(168, 85, 255)' : '#f4f3f4'}
              />
            </View>

            {!formData.isUnlimited && (
              <View style={styles.capacityInputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="people-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.totalCapacity}
                    onChangeText={(text) => setFormData({ ...formData, totalCapacity: text })}
                    placeholder="ej: 100"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    keyboardType="number-pad"
                  />
                </View>
                {parseInt(formData.totalCapacity) > 0 && (
                  <View style={styles.capacitySummary}>
                    <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />
                    <Text style={styles.capacitySummaryLabel}> Máximo {formData.totalCapacity} personas</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Table Count Section - Always required */}
          <View style={styles.field}>
            <Text style={styles.label}>Número de Mesas <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Cada reserva de mesa consume 1 slot de mesa</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="grid-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.tableCount}
                onChangeText={(text) => setFormData({ ...formData, tableCount: text })}
                placeholder="ej: 10"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                keyboardType="number-pad"
              />
            </View>
            {parseInt(formData.tableCount) > 0 && (
              <View style={styles.capacitySummary}>
                <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />
                <Text style={styles.capacitySummaryLabel}> {formData.tableCount} mesas disponibles</Text>
              </View>
            )}
          </View>
        </>
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
              <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
        >
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.submitButtonInner}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>
                    {isUploadingImage ? 'Uploading...' : 'Saving...'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </>
              )}
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        onPress={handleDelete}
        disabled={isDeletingEvent}
        activeOpacity={0.8}
        style={styles.deleteButton}
      >
        <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
          <View style={styles.deleteButtonInner}>
            {isDeletingEvent ? (
              <>
                <ActivityIndicator color="rgb(239, 68, 68)" size="small" />
                <Text style={styles.deleteButtonText}>Deleting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="rgb(239, 68, 68)" />
                <Text style={styles.deleteButtonText}>Delete Event</Text>
              </>
            )}
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
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
                <Ionicons name="pencil" size={28} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.headerTitle}>Edit Event</Text>
              <Text style={styles.headerSubtitle}>Modify event details</Text>
            </View>

            {/* Render Form */}
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Event Date</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
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
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Start Time</Text>
                <TouchableOpacity onPress={confirmStartTimeSelection}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
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
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>End Time</Text>
                <TouchableOpacity onPress={confirmEndTimeSelection}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
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
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  deleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: 'rgb(239, 68, 68)',
    fontSize: 15,
    fontWeight: '600',
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

  // VIP Capacity Distribution Styles
  vipDistributionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
    marginTop: 12,
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
});
