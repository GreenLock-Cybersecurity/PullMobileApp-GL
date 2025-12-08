// app/(tabs)/EventosList/EventoNuevo.js - WIZARD MULTI-STEP CON TICKET TYPES + IMAGE PICKER
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import { eventService } from '@/services/eventService';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '@/services/uploadService';

export default function EventoNuevo() {
  const router = useRouter();
  const { selectedVenue } = useDataStore();

  // Step control: 1 = Event Details, 2 = Ticket Types
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Currency helper
  const getCurrencySymbol = () => {
    const currency = selectedVenue?.currency || 'GTQ';
    const symbols = { GTQ: 'Q', USD: '$', EUR: '€', MXN: '$' };
    return symbols[currency] || currency;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, event_date: formatted });
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setFormData({ ...formData, start_time: `${hours}:${minutes}:00` });
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setFormData({ ...formData, end_time: `${hours}:${minutes}:00` });
    }
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
    if (!formData.ticket_limit) {
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
      min_quantity: ticketForm.is_group && ticketForm.min_quantity ? parseInt(ticketForm.min_quantity) : 0,
      max_quantity: ticketForm.is_group && ticketForm.max_quantity ? parseInt(ticketForm.max_quantity) : 0,
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

  // Final submit
  const handleSubmit = async () => {
    if (ticketTypes.length === 0) {
      Alert.alert('Error', 'You must add at least one ticket type');
      return;
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
      const payload = {
        name: formData.name,
        description: formData.description,
        image: uploadResult.data.url,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : 0,
        dress_code: formData.dress_code,
        min_age: formData.min_age ? parseInt(formData.min_age) : 18,
        custom_location: formData.custom_location,
        ticket_types: ticketTypes,
      };

      const result = await eventService.createEventWithTickets(payload);

      if (result.success) {
        Alert.alert('Success', 'Event created successfully with ticket types!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create event');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  // Render Step Indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepRow}>
        {/* Step 1: Label LEFT of circle */}
        <View style={styles.stepItemLeft}>
          <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Event Details</Text>
          <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
        </View>

        {/* Line */}
        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

        {/* Step 2: Label RIGHT of circle */}
        <View style={styles.stepItemRight}>
          <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Ticket Types</Text>
        </View>
      </View>
    </View>
  );

  // Render Step 1 - Event Details
  const renderStep1 = () => (
    <BlurView intensity={80} tint="dark" style={styles.formCard}>
      <View style={styles.formCardInner}>
        {/* Event Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Event Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Summer Night Party"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter event description..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Event Image Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Event Image <Text style={styles.required}>*</Text>
          </Text>

          {selectedImage ? (
            // Image Preview
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={styles.changeImageBtn}
                  onPress={pickImage}
                >
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={removeImage}
                >
                  <Ionicons name="trash" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Image Picker Button
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.15)', 'rgba(217, 70, 239, 0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.imagePickerContent}>
                <View style={styles.imagePickerIconCircle}>
                  <Ionicons name="image-outline" size={32} color="rgba(167, 139, 250, 0.9)" />
                </View>
                <Text style={styles.imagePickerTitle}>Select Event Image</Text>
                <Text style={styles.imagePickerSubtitle}>Tap to choose from gallery</Text>
                <Text style={styles.imagePickerHint}>JPEG, PNG or WebP • Max 10MB</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Event Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Event Date <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formData.event_date || 'Select date'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="rgba(139, 92, 246, 0.9)" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.event_date ? new Date(formData.event_date) : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Time Section */}
        <View style={styles.timeRow}>
          {/* Start Time */}
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>
              Start Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formData.start_time ? formData.start_time.slice(0, 5) : 'Start'}
              </Text>
              <Ionicons name="time-outline" size={20} color="rgba(34, 211, 238, 0.9)" />
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={handleStartTimeChange}
              />
            )}
          </View>

          {/* End Time */}
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>
              End Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formData.end_time ? formData.end_time.slice(0, 5) : 'End'}
              </Text>
              <Ionicons name="time-outline" size={20} color="rgba(34, 211, 238, 0.9)" />
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={handleEndTimeChange}
              />
            )}
          </View>
        </View>

        {/* Ticket Limit */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Ticket Limit (Global) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.ticket_limit}
            onChangeText={(text) => setFormData({ ...formData, ticket_limit: text })}
            placeholder="0 for unlimited"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            keyboardType="numeric"
          />
        </View>

        {/* Min Age */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Minimum Age <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.min_age}
            onChangeText={(text) => setFormData({ ...formData, min_age: text })}
            placeholder="18"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            keyboardType="numeric"
          />
        </View>

        {/* Dress Code */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Dress Code <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.dress_code}
            onChangeText={(text) => setFormData({ ...formData, dress_code: text })}
            placeholder="e.g., Smart casual, Formal, etc."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        </View>

        {/* Custom Location */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Custom Location</Text>
          <TextInput
            style={styles.input}
            value={formData.custom_location}
            onChangeText={(text) => setFormData({ ...formData, custom_location: text })}
            placeholder="Optional: Override venue location"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        </View>

        {/* Next Button - Glass Morphism */}
        <View style={styles.glassButtonContainer}>
          <BlurView intensity={25} tint="light" style={styles.glassButtonBlur}>
            <TouchableOpacity
              style={styles.glassButton}
              onPress={goToStep2}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.3)', 'rgba(217, 70, 239, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.glassButtonText}>Continue to Ticket Types</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </BlurView>
  );

  // Render Step 2 - Ticket Types
  const renderStep2 = () => (
    <BlurView intensity={80} tint="dark" style={styles.formCard}>
      <View style={styles.formCardInner}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="ticket-outline" size={20} color="rgba(167, 139, 250, 0.9)" /> Ticket Types
        </Text>
        <Text style={styles.sectionSubtitle}>Add at least one ticket type for your event</Text>

        {/* List of ticket types */}
        {ticketTypes.map((ticket, index) => (
          <View key={index} style={styles.ticketTypeItem}>
            <BlurView intensity={40} tint="dark" style={styles.ticketTypeBlur}>
              <View style={styles.ticketTypeContent}>
                <View style={styles.ticketTypeHeader}>
                  <Text style={styles.ticketTypeName}>{ticket.name}</Text>
                  <View style={styles.ticketTypeActions}>
                    <TouchableOpacity
                      onPress={() => openEditTicketModal(index)}
                      style={styles.ticketTypeActionBtn}
                    >
                      <Ionicons name="pencil" size={18} color="rgba(34, 211, 238, 0.9)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTicketType(index)}
                      style={styles.ticketTypeActionBtn}
                    >
                      <Ionicons name="trash" size={18} color="rgba(239, 68, 68, 0.9)" />
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
            </BlurView>
          </View>
        ))}

        {/* Add Ticket Type Button - Glass Morphism */}
        <View style={styles.glassButtonContainer}>
          <BlurView intensity={25} tint="light" style={styles.glassButtonBlur}>
            <TouchableOpacity
              style={styles.glassButton}
              onPress={openAddTicketModal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(34, 211, 238, 0.3)', 'rgba(59, 130, 246, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.glassButtonText}>Add Ticket Type</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {/* Back Button - Glass Morphism */}
          <View style={[styles.glassButtonContainer, { flex: 1 }]}>
            <BlurView intensity={25} tint="light" style={styles.glassButtonBlur}>
              <TouchableOpacity
                style={styles.glassButton}
                onPress={goToStep1}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="arrow-back" size={20} color="white" />
                <Text style={styles.glassButtonText}>Back</Text>
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Create Event Button - Glass Morphism */}
          <View style={[styles.glassButtonContainer, { flex: 2 }]}>
            <BlurView intensity={25} tint="light" style={styles.glassButtonBlur}>
              <TouchableOpacity
                style={[styles.glassButton, ticketTypes.length === 0 && styles.glassButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={isSubmitting || ticketTypes.length === 0}
              >
                <LinearGradient
                  colors={ticketTypes.length === 0
                    ? ['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']
                    : ['rgba(139, 92, 246, 0.4)', 'rgba(217, 70, 239, 0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.glassButtonText}>
                      {isUploadingImage ? 'Uploading Image...' : 'Creating Event...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.glassButtonText}>Create Event</Text>
                  </>
                )}
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </View>
    </BlurView>
  );

  // Render Ticket Type Modal
  const renderTicketModal = () => (
    <Modal
      visible={showTicketModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTicketModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
              {/* Ticket Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={ticketForm.name}
                  onChangeText={(text) => setTicketForm({ ...ticketForm, name: text })}
                  placeholder="e.g., General Admission, VIP"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                />
              </View>

              {/* Price */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Price ({getCurrencySymbol()}) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={ticketForm.price}
                  onChangeText={(text) => setTicketForm({ ...ticketForm, price: text })}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Quantity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Available Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={ticketForm.quantity}
                  onChangeText={(text) => setTicketForm({ ...ticketForm, quantity: text })}
                  placeholder="100"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="number-pad"
                />
              </View>

              {/* Benefits */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Benefits <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={ticketForm.benefits}
                  onChangeText={(text) => setTicketForm({ ...ticketForm, benefits: text })}
                  placeholder="e.g., Free drink, Priority entry..."
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
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
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(139, 92, 246, 0.5)' }}
                  thumbColor={ticketForm.is_group ? 'rgba(167, 139, 250, 1)' : '#f4f3f4'}
                />
              </View>

              {/* Group Options */}
              {ticketForm.is_group && (
                <>
                  <View style={styles.timeRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>
                        Min People <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={ticketForm.min_quantity}
                        onChangeText={(text) => setTicketForm({ ...ticketForm, min_quantity: text })}
                        placeholder="1"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>
                        Max People <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={ticketForm.max_quantity}
                        onChangeText={(text) => setTicketForm({ ...ticketForm, max_quantity: text })}
                        placeholder="10"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="number-pad"
                      />
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
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(217, 70, 239, 0.5)' }}
                      thumbColor={ticketForm.has_gender_pricing ? 'rgba(217, 70, 239, 1)' : '#f4f3f4'}
                    />
                  </View>

                  {/* Gender Prices */}
                  {ticketForm.has_gender_pricing && (
                    <View style={styles.timeRow}>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>
                          Male Price ({getCurrencySymbol()}) <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={ticketForm.male_price}
                          onChangeText={(text) => setTicketForm({ ...ticketForm, male_price: text })}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>
                          Female Price ({getCurrencySymbol()}) <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={ticketForm.female_price}
                          onChangeText={(text) => setTicketForm({ ...ticketForm, female_price: text })}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Save Button - Glass Morphism */}
              <View style={[styles.glassButtonContainer, { marginTop: 20 }]}>
                <BlurView intensity={25} tint="light" style={styles.glassButtonBlur}>
                  <TouchableOpacity
                    style={styles.glassButton}
                    onPress={saveTicketType}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(34, 211, 238, 0.4)', 'rgba(59, 130, 246, 0.4)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.glassButtonText}>
                      {editingTicketIndex !== null ? 'Update Ticket Type' : 'Add Ticket Type'}
                    </Text>
                  </TouchableOpacity>
                </BlurView>
              </View>
            </ScrollView>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={24}
    >
      <View style={styles.overlay} />

      {/* Custom Header */}
      <CustomHeader showBackButton />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, paddingTop: 56 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Page Title */}
            <View style={styles.pageTitleContainer}>
              <Ionicons name="calendar-outline" size={28} color="rgba(167, 139, 250, 0.9)" />
              <Text style={styles.pageTitle}>New Event</Text>
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Render Current Step */}
            {currentStep === 1 ? renderStep1() : renderStep2()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Ticket Type Modal */}
      {renderTicketModal()}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  pageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pageTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  // Step Indicator
  stepIndicator: {
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.8)',
  },
  stepNumber: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
  },
  stepLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: 'rgba(167, 139, 250, 0.9)',
  },
  // Form
  formCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  formCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
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
  required: {
    color: 'rgba(239, 68, 68, 0.9)',
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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  // Glass Buttons
  glassButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  glassButtonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  glassButtonDisabled: {
    opacity: 0.5,
  },
  glassButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // Section title
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginBottom: 20,
  },
  // Ticket Type Items
  ticketTypeItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ticketTypeBlur: {
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
    color: 'rgba(34, 211, 238, 0.9)',
    fontSize: 18,
    fontWeight: '700',
  },
  ticketTypeQty: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  groupBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    color: 'rgba(167, 139, 250, 1)',
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
  // Navigation buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
});
