// app/(tabs)/ReservasList/VIPListNuevo.js - Create VIP List Reservation
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Animated,
  Share,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';
import { OptimizedImage } from '@/components/OptimizedImage';
import { vipListService } from '@/services/vipListService';

export default function VIPListNuevo() {
  const router = useRouter();
  const { selectedVenue, events, isLoadingEvents, fetchUpcomingEvents } = useDataStore();
  const user = useAuthStore((state) => state.user);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Step control: 1 = Select Event & Type, 2 = Host Data, 3 = Configuration
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected event (separate state for reliability)
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventName, setSelectedEventName] = useState('');
  const [selectedEventDate, setSelectedEventDate] = useState(null);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdReservation, setCreatedReservation] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    table_or_bar: '', // 'table' or 'bar'
    host_name: '',
    host_last_name: '',
    host_email: '',
    host_phone: '',
    host_phone_prefix: '+502',
    host_birth_date: '',
    host_gender: '', // 'male' or 'female'
    expected_men: '0',
    expected_women: '0',
    reservation_name: '',
    description: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Temp value for iOS picker (to allow cancel functionality)
  const [tempBirthDate, setTempBirthDate] = useState(new Date(2000, 0, 1));

  // Load events on mount using store
  useEffect(() => {
    if (user?.venue_id_real) {
      fetchUpcomingEvents(user.venue_id_real);
    }
  }, [user?.venue_id_real]);

  // Open birth date picker with current value
  const openBirthDatePicker = () => {
    setTempBirthDate(formData.host_birth_date ? new Date(formData.host_birth_date) : new Date(2000, 0, 1));
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const formatted = selectedDate.toISOString().split('T')[0];
        setFormData({ ...formData, host_birth_date: formatted });
      }
    } else {
      // iOS - just update temp value, don't close
      if (selectedDate) {
        setTempBirthDate(selectedDate);
      }
    }
  };

  const confirmBirthDateSelection = () => {
    const formatted = tempBirthDate.toISOString().split('T')[0];
    setFormData({ ...formData, host_birth_date: formatted });
    setShowDatePicker(false);
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event');
      return false;
    }
    if (!formData.table_or_bar) {
      Alert.alert('Error', 'Please select reservation type (Table or Bar)');
      return false;
    }
    return true;
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (!formData.host_name || !formData.host_last_name) {
      Alert.alert('Error', 'Please enter host name and last name');
      return false;
    }
    if (!formData.host_email) {
      Alert.alert('Error', 'Please enter host email');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.host_email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.host_phone) {
      Alert.alert('Error', 'Please enter host phone number');
      return false;
    }
    if (!formData.host_birth_date) {
      Alert.alert('Error', 'Please enter host birth date');
      return false;
    }
    if (!formData.host_gender) {
      Alert.alert('Error', 'Please select host gender');
      return false;
    }
    return true;
  };

  // Step 3 validation (no required fields, price comes from event)
  const validateStep3 = () => {
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) setCurrentStep(2);
  };

  const goToStep3 = () => {
    if (validateStep2()) {
      // Initialize expected guests based on host gender (host counts as 1)
      if (formData.host_gender === 'male') {
        setFormData(prev => ({
          ...prev,
          expected_men: Math.max(parseInt(prev.expected_men) || 0, 1).toString(),
        }));
      } else if (formData.host_gender === 'female') {
        setFormData(prev => ({
          ...prev,
          expected_women: Math.max(parseInt(prev.expected_women) || 0, 1).toString(),
        }));
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        event_id: selectedEventId,
        table_or_bar: formData.table_or_bar,
        host_name: formData.host_name,
        host_last_name: formData.host_last_name,
        host_email: formData.host_email,
        host_phone: formData.host_phone || '',
        host_phone_prefix: formData.host_phone_prefix || '+502',
        host_birth_date: formData.host_birth_date || '',
        host_gender: formData.host_gender,
        expected_men: parseInt(formData.expected_men) || 0,
        expected_women: parseInt(formData.expected_women) || 0,
        reservation_name: formData.reservation_name || '',
        description: formData.description || '',
      };

      const result = await vipListService.create(payload);

      if (result.success) {
        setCreatedReservation(result.data);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareLink = async () => {
    if (!createdReservation?.tracking_url) return;

    const hostName = formData.host_name || 'alguien';

    // Format date nicely in Spanish
    const formattedDate = selectedEventDate
      ? new Date(selectedEventDate).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    // Build attractive message with emojis (same as VIPListDetalle)
    let message = `🔥 ¡Únete a la reserva de ${hostName} para ${selectedEventName}! 🍸\n\n`;
    if (formattedDate) {
      message += `📅 ${formattedDate}\n\n`;
    }
    message += `👉 Reservá tu lugar en la lista VIP:\n${createdReservation.tracking_url}\n\n`;
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

  const handleViewReservation = () => {
    setShowSuccessModal(false);
    router.replace(`/(tabs)/ReservasList/VIPListDetalle?id=${createdReservation.reservation_id}`);
  };

  const handleDone = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return { icon: 'calendar', title: 'New VIP List', subtitle: 'Step 1: Select Event & Type' };
      case 2:
        return { icon: 'person', title: 'Host Information', subtitle: 'Step 2: Enter host details' };
      case 3:
        return { icon: 'settings', title: 'Configuration', subtitle: 'Step 3: Set price and details' };
      default:
        return { icon: 'star', title: 'New VIP List', subtitle: 'Create a new reservation' };
    }
  };

  const stepInfo = getStepInfo();

  // Render Step 1 - Event & Type Selection
  const renderStep1 = () => (
    <View style={styles.form}>
      {/* Event Selection */}
      <View style={styles.field}>
        <Text style={styles.label}>Select Event <Text style={styles.required}>*</Text></Text>
        {isLoadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="rgb(168, 85, 255)" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>No upcoming events</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={events}
            keyExtractor={(item, index) => item.id?.toString() || `event-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsScrollContainer}
            style={styles.eventsScroll}
            extraData={selectedEventId}
            renderItem={({ item }) => {
              const eventDate = new Date(item.date);
              const isSelected = selectedEventId === item.id;

              return (
                <TouchableOpacity
                  style={[
                    styles.eventCard,
                    isSelected && styles.eventCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedEventId(item.id);
                    setSelectedEventName(item.name);
                    setSelectedEventDate(item.date);
                  }}
                  activeOpacity={0.8}
                >
                  <OptimizedImage
                    source={{
                      uri: item.poster || 'https://via.placeholder.com/160x200?text=Event',
                    }}
                    style={styles.eventImage}
                    contentFit="cover"
                  />
                  <View style={styles.eventOverlay} />

                  {isSelected && (
                    <View style={styles.eventSelectedBadge}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  )}

                  <View style={styles.eventCardContent}>
                    <View style={styles.eventDateBadge}>
                      <Text style={styles.eventDateDay}>
                        {eventDate.getDate()}
                      </Text>
                      <Text style={styles.eventDateMonth}>
                        {eventDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Reservation Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Reservation Type <Text style={styles.required}>*</Text></Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              formData.table_or_bar === 'table' && styles.typeOptionSelected,
            ]}
            onPress={() => setFormData({ ...formData, table_or_bar: 'table' })}
            activeOpacity={0.8}
          >
            <View style={[
              styles.typeIconWrapper,
              formData.table_or_bar === 'table' && styles.typeIconWrapperSelected,
            ]}>
              <Ionicons
                name="restaurant-outline"
                size={32}
                color={formData.table_or_bar === 'table' ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.5)'}
              />
            </View>
            <Text style={[
              styles.typeText,
              formData.table_or_bar === 'table' && styles.typeTextSelected,
            ]}>
              Table
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              formData.table_or_bar === 'bar' && styles.typeOptionSelected,
            ]}
            onPress={() => setFormData({ ...formData, table_or_bar: 'bar' })}
            activeOpacity={0.8}
          >
            <View style={[
              styles.typeIconWrapper,
              formData.table_or_bar === 'bar' && styles.typeIconWrapperSelected,
            ]}>
              <Ionicons
                name="beer-outline"
                size={32}
                color={formData.table_or_bar === 'bar' ? 'rgb(168, 85, 255)' : 'rgba(255, 255, 255, 0.5)'}
              />
            </View>
            <Text style={[
              styles.typeText,
              formData.table_or_bar === 'bar' && styles.typeTextSelected,
            ]}>
              Bar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Buttons */}
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

  // Render Step 2 - Host Data
  const renderStep2 = () => (
    <View style={styles.form}>
      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Name <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.host_name}
            onChangeText={(text) => setFormData({ ...formData, host_name: text })}
            placeholder="First name"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Last Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Last Name <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.host_last_name}
            onChangeText={(text) => setFormData({ ...formData, host_last_name: text })}
            placeholder="Last name"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Email <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.host_email}
            onChangeText={(text) => setFormData({ ...formData, host_email: text.toLowerCase() })}
            placeholder="email@example.com"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Phone */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Phone <Text style={styles.required}>*</Text></Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefixWrapper}>
            <TextInput
              style={styles.prefixInput}
              value={formData.host_phone_prefix}
              onChangeText={(text) => setFormData({ ...formData, host_phone_prefix: text })}
              placeholder="+502"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
            />
          </View>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Ionicons name="call-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.host_phone}
              onChangeText={(text) => setFormData({ ...formData, host_phone: text })}
              placeholder="Phone number"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      {/* Birth Date */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Birth Date <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity style={styles.dateButton} onPress={openBirthDatePicker}>
          <Ionicons name="calendar-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
          <Text style={[styles.dateButtonText, !formData.host_birth_date && styles.placeholder]}>
            {formData.host_birth_date || 'Select date'}
          </Text>
        </TouchableOpacity>
        {/* Android Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempBirthDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Gender */}
      <View style={styles.field}>
        <Text style={styles.label}>Host Gender <Text style={styles.required}>*</Text></Text>
        <View style={styles.genderSelector}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              formData.host_gender === 'male' && styles.genderOptionMale,
            ]}
            onPress={() => setFormData({ ...formData, host_gender: 'male' })}
            activeOpacity={0.8}
          >
            <Ionicons
              name="male"
              size={24}
              color={formData.host_gender === 'male' ? 'rgb(59, 130, 246)' : 'rgba(255, 255, 255, 0.5)'}
            />
            <Text style={[
              styles.genderText,
              formData.host_gender === 'male' && { color: 'rgb(59, 130, 246)' },
            ]}>
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderOption,
              formData.host_gender === 'female' && styles.genderOptionFemale,
            ]}
            onPress={() => setFormData({ ...formData, host_gender: 'female' })}
            activeOpacity={0.8}
          >
            <Ionicons
              name="female"
              size={24}
              color={formData.host_gender === 'female' ? 'rgb(236, 72, 153)' : 'rgba(255, 255, 255, 0.5)'}
            />
            <Text style={[
              styles.genderText,
              formData.host_gender === 'female' && { color: 'rgb(236, 72, 153)' },
            ]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={() => setCurrentStep(1)} activeOpacity={0.8} style={styles.cancelButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToStep3} activeOpacity={0.8} style={styles.submitButton}>
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

  // Render Step 3 - Configuration
  const renderStep3 = () => (
    <View style={styles.form}>
      {/* Expected Guests */}
      <View style={styles.field}>
        <Text style={styles.label}>Expected Guests</Text>
        <Text style={styles.fieldHint}>Host is included in the count</Text>
        <View style={styles.guestsRow}>
          {/* Men Counter */}
          <View style={styles.guestField}>
            <View style={styles.guestLabelRow}>
              <Ionicons name="male" size={18} color="rgb(59, 130, 246)" />
              <Text style={[styles.guestLabel, { color: 'rgb(59, 130, 246)' }]}>Men</Text>
              {formData.host_gender === 'male' && (
                <View style={styles.hostIncludedBadge}>
                  <Text style={styles.hostIncludedText}>Host</Text>
                </View>
              )}
            </View>
            <View style={styles.counterWrapper}>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  (parseInt(formData.expected_men) || 0) <= (formData.host_gender === 'male' ? 1 : 0) && styles.counterButtonDisabled,
                ]}
                onPress={() => {
                  const minValue = formData.host_gender === 'male' ? 1 : 0;
                  const current = parseInt(formData.expected_men) || 0;
                  if (current > minValue) {
                    setFormData({ ...formData, expected_men: (current - 1).toString() });
                  }
                }}
                disabled={(parseInt(formData.expected_men) || 0) <= (formData.host_gender === 'male' ? 1 : 0)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={(parseInt(formData.expected_men) || 0) <= (formData.host_gender === 'male' ? 1 : 0) ? 'rgba(255, 255, 255, 0.2)' : 'rgb(59, 130, 246)'} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{formData.expected_men || '0'}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => {
                  const current = parseInt(formData.expected_men) || 0;
                  setFormData({ ...formData, expected_men: (current + 1).toString() });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="rgb(59, 130, 246)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Women Counter */}
          <View style={styles.guestField}>
            <View style={styles.guestLabelRow}>
              <Ionicons name="female" size={18} color="rgb(236, 72, 153)" />
              <Text style={[styles.guestLabel, { color: 'rgb(236, 72, 153)' }]}>Women</Text>
              {formData.host_gender === 'female' && (
                <View style={[styles.hostIncludedBadge, { backgroundColor: 'rgba(236, 72, 153, 0.2)', borderColor: 'rgba(236, 72, 153, 0.4)' }]}>
                  <Text style={[styles.hostIncludedText, { color: 'rgb(236, 72, 153)' }]}>Host</Text>
                </View>
              )}
            </View>
            <View style={styles.counterWrapper}>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  (parseInt(formData.expected_women) || 0) <= (formData.host_gender === 'female' ? 1 : 0) && styles.counterButtonDisabled,
                ]}
                onPress={() => {
                  const minValue = formData.host_gender === 'female' ? 1 : 0;
                  const current = parseInt(formData.expected_women) || 0;
                  if (current > minValue) {
                    setFormData({ ...formData, expected_women: (current - 1).toString() });
                  }
                }}
                disabled={(parseInt(formData.expected_women) || 0) <= (formData.host_gender === 'female' ? 1 : 0)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={(parseInt(formData.expected_women) || 0) <= (formData.host_gender === 'female' ? 1 : 0) ? 'rgba(255, 255, 255, 0.2)' : 'rgb(236, 72, 153)'} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{formData.expected_women || '0'}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => {
                  const current = parseInt(formData.expected_women) || 0;
                  setFormData({ ...formData, expected_women: (current + 1).toString() });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="rgb(236, 72, 153)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Reservation Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Reservation Name</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="bookmark-outline" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.reservation_name}
            onChangeText={(text) => setFormData({ ...formData, reservation_name: text })}
            placeholder="e.g., Birthday Party (optional)"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.inputSimple, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Notes about the reservation (optional)"
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Event</Text>
          <Text style={styles.summaryValue}>{selectedEventName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{formData.table_or_bar === 'table' ? 'Table' : 'Bar'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Host</Text>
          <Text style={styles.summaryValue}>{formData.host_name} {formData.host_last_name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Expected</Text>
          <Text style={styles.summaryValue}>{parseInt(formData.expected_men || 0) + parseInt(formData.expected_women || 0)} guests</Text>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={() => setCurrentStep(2)} activeOpacity={0.8} style={styles.cancelButton}>
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
          style={styles.submitButton}
        >
          <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
            <View style={styles.createButtonInner}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={styles.submitButtonText}>Create VIP List</Text>
                </>
              )}
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );

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
                <Ionicons name={stepInfo.icon} size={28} color="rgb(168, 85, 255)" />
              </View>
              <Text style={styles.headerTitle}>{stepInfo.title}</Text>
              <Text style={styles.headerSubtitle}>{stepInfo.subtitle}</Text>
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map((step) => (
                <View key={step} style={styles.stepDotContainer}>
                  <View style={[
                    styles.stepDot,
                    currentStep >= step && styles.stepDotActive,
                    currentStep === step && styles.stepDotCurrent,
                  ]} />
                  {step < 3 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
                </View>
              ))}
            </View>

            {/* Render Current Step */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* iOS Birth Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Birth Date</Text>
                <TouchableOpacity onPress={confirmBirthDateSelection}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempBirthDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                textColor="#ffffff"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.successModalBlur}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={64} color="rgb(16, 185, 129)" />
              </View>

              <Text style={styles.successTitle}>VIP List Created!</Text>
              <Text style={styles.successSubtitle}>
                Share the link with your guests so they can RSVP
              </Text>

              {createdReservation?.tracking_url && (
                <View style={styles.linkContainer}>
                  <Text style={styles.linkText} numberOfLines={2}>
                    {createdReservation.tracking_url}
                  </Text>
                </View>
              )}

              <View style={styles.successActions}>
                <TouchableOpacity onPress={handleShareLink} activeOpacity={0.8} style={styles.shareButton}>
                  <Ionicons name="share-outline" size={20} color="rgb(168, 85, 255)" />
                  <Text style={styles.shareButtonText}>Share Link</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleViewReservation} activeOpacity={0.8} style={styles.viewButton}>
                  <Ionicons name="eye-outline" size={20} color="white" />
                  <Text style={styles.viewButtonText}>View Reservation</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
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
    marginBottom: 24,
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

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(168, 85, 255, 0.5)',
  },
  stepDotCurrent: {
    backgroundColor: 'rgb(168, 85, 255)',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: 'rgba(168, 85, 255, 0.5)',
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

  // Inputs
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

  // Loading & Empty
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },

  // Events List
  eventsScroll: {
    marginHorizontal: -24,
  },
  eventsScrollContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  eventCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eventCardSelected: {
    borderColor: 'rgb(168, 85, 255)',
  },
  eventImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  eventOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  eventSelectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgb(168, 85, 255)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  eventCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  eventDateBadge: {
    backgroundColor: 'rgba(168, 85, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  eventDateDay: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  eventDateMonth: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  eventName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    gap: 12,
  },
  typeOptionSelected: {
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderColor: 'rgba(168, 85, 255, 0.4)',
  },
  typeIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconWrapperSelected: {
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
  },
  typeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: 'rgb(168, 85, 255)',
  },

  // Date Button
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

  // Phone Row
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefixWrapper: {
    width: 80,
  },
  prefixInput: {
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 15,
    textAlign: 'center',
  },

  // Gender Selector
  genderSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  genderOptionMale: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  genderOptionFemale: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  genderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Guests Row
  guestsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  guestField: {
    flex: 1,
    gap: 8,
  },
  guestLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  guestInput: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 15,
    textAlign: 'center',
  },
  fieldHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: -4,
    marginBottom: 4,
  },
  hostIncludedBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 6,
  },
  hostIncludedText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgb(59, 130, 246)',
    textTransform: 'uppercase',
  },
  counterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  counterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    minWidth: 40,
    textAlign: 'center',
  },

  // Summary Card
  summaryCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    gap: 12,
  },
  summaryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  summaryValue: {
    color: 'white',
    fontSize: 13,
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
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 12,
  },

  // Success Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalBlur: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  successModalContent: {
    backgroundColor: 'rgba(15, 15, 21, 0.98)',
    padding: 28,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  linkContainer: {
    width: '100%',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  linkText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 13,
    textAlign: 'center',
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 12,
  },
  shareButtonText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 15,
    fontWeight: '600',
  },
  viewButton: {
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
  viewButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 10,
  },
  doneButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
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
