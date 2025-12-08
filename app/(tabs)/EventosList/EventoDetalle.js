// app/(tabs)/EventosList/EventoDetalle.js - COMPLETO CORREGIDO
import { useEffect, useState, useLayoutEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '@/components/CustomHeader';
import * as ticketTypeService from '@/services/ticketTypeService';
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
  const insets = useSafeAreaInsets();

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
    dress_code: '',
    min_age: '',
    custom_location: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Image picker state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Ticket types state
  const [isTicketTypesModalVisible, setIsTicketTypesModalVisible] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [isLoadingTicketTypes, setIsLoadingTicketTypes] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState(null);
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
  const FEE_PERCENTAGE = 11.2;

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
    }
    return () => {
      clearCurrentEvent();
    };
  }, [id, fetchEventDetail, clearCurrentEvent]);

  useEffect(() => {
    if (currentEvent && isEditModalVisible) {
      setEditForm({
        name: currentEvent.event_name || '',
        description: currentEvent.description || '',
        image: currentEvent.event_img || '',
        event_date: currentEvent.event_date || '',
        start_time: currentEvent.start_time || '',
        end_time: currentEvent.end_time || '',
        ticket_limit: currentEvent.ticket_limit?.toString() || '',
        dress_code: currentEvent.dress_code || '',
        min_age: currentEvent.min_age?.toString() || '18',
        custom_location: currentEvent.custom_location || '',
      });
    }
  }, [currentEvent, isEditModalVisible]);

  // Load ticket types when ticket types modal opens
  useEffect(() => {
    if (isTicketTypesModalVisible && id) {
      loadTicketTypes();
    }
  }, [isTicketTypesModalVisible, id]);

  const loadTicketTypes = async () => {
    setIsLoadingTicketTypes(true);
    try {
      const response = await ticketTypeService.getTicketTypesByEvent(id);
      setTicketTypes(response.data || []);
    } catch {
      setTicketTypes([]);
    } finally {
      setIsLoadingTicketTypes(false);
    }
  };

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
    if (!ticketTypeForm.name || !ticketTypeForm.price || !ticketTypeForm.initialQuantity) {
      Alert.alert('Error', 'Name, price and initial quantity are required');
      return;
    }

    if (ticketTypeForm.hasGenderPricing && (!ticketTypeForm.malePrice || !ticketTypeForm.femalePrice)) {
      Alert.alert('Error', 'Male and female prices are required for gender-based pricing');
      return;
    }

    setIsSavingTicketType(true);
    try {
      const data = {
        name: ticketTypeForm.name,
        price: parseFloat(ticketTypeForm.price),
        initialQuantity: parseInt(ticketTypeForm.initialQuantity),
        benefits: ticketTypeForm.benefits || null,
        expenses: ticketTypeForm.expenses ? parseFloat(ticketTypeForm.expenses) : null,
        isGroup: ticketTypeForm.isGroup,
        minQuantity: ticketTypeForm.minQuantity ? parseInt(ticketTypeForm.minQuantity) : null,
        maxQuantity: ticketTypeForm.maxQuantity ? parseInt(ticketTypeForm.maxQuantity) : null,
        hasGenderPricing: ticketTypeForm.hasGenderPricing,
        malePrice: ticketTypeForm.malePrice ? parseFloat(ticketTypeForm.malePrice) : null,
        femalePrice: ticketTypeForm.femalePrice ? parseFloat(ticketTypeForm.femalePrice) : null,
      };

      if (editingTicketType) {
        await ticketTypeService.updateTicketType(editingTicketType, data);
        Alert.alert('Success', 'Ticket type updated');
      } else {
        await ticketTypeService.createTicketType(id, data);
        Alert.alert('Success', 'Ticket type created');
      }

      resetTicketTypeForm();
      loadTicketTypes();
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
            try {
              await ticketTypeService.deleteTicketType(ticketId);
              Alert.alert('Success', 'Ticket type deleted');
              loadTicketTypes();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete ticket type');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    if (id) {
      fetchEventDetail(id);
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

      const result = await updateEvent(id, {
        name: editForm.name,
        description: editForm.description,
        image: imageUrl,
        event_date: editForm.event_date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        ticket_limit: editForm.ticket_limit ? parseInt(editForm.ticket_limit) : 0,
        dress_code: editForm.dress_code,
        min_age: editForm.min_age ? parseInt(editForm.min_age) : 18,
        custom_location: editForm.custom_location,
      });

      if (result.success) {
        Alert.alert('Success', 'Event updated successfully');
        setIsEditModalVisible(false);
        setSelectedImage(null);
        onRefresh();
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
                    setIsEditModalVisible(false);
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      setEditForm({ ...editForm, event_date: formatted });
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEditForm({ ...editForm, start_time: `${hours}:${minutes}:00` });
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEditForm({ ...editForm, end_time: `${hours}:${minutes}:00` });
    }
  };

  if (isLoadingEventDetail) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={20}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
            <Text style={styles.loadingText}>Loading event details...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (eventDetailError) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={20}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text style={styles.errorText}>{eventDetailError}</Text>
            <TouchableOpacity onPress={onRefresh} activeOpacity={0.8} style={{ marginTop: 16 }}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
              <Text style={styles.linkText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!currentEvent) {
    return (
      <ImageBackground
        source={require('../../../assets/fondo.webp')}
        style={styles.background}
        blurRadius={20}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Event not found</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{ marginTop: 16 }}
            >
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

  const backgroundImage = currentEvent.event_img 
    ? { uri: currentEvent.event_img }
    : require('../../../assets/fondo.webp');

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      blurRadius={20}
    >
      <View style={styles.overlayLight} />
      <CustomHeader showBackButton />
      <ScrollView
        style={[styles.scrollView, { paddingTop: headerHeight }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEventDetail}
            onRefresh={onRefresh}
            tintColor="rgba(139, 92, 246, 0.9)"
          />
        }
      >
          <Text style={styles.eventTitle}>{currentEvent.event_name}</Text>

          <View style={isSmallScreen ? styles.contentMobile : styles.contentDesktop}>
            <View style={isSmallScreen ? styles.posterContainerMobile : styles.posterContainerDesktop}>
              <Image
                source={{
                  uri: currentEvent.event_img || 'https://via.placeholder.com/400x600?text=No+Image',
                }}
                style={styles.posterBackground}
                resizeMode="cover"
                blurRadius={30}
              />
              
              <Image
                source={{
                  uri: currentEvent.event_img || 'https://via.placeholder.com/400x600?text=No+Image',
                }}
                style={styles.posterImage}
                resizeMode="contain"
              />
            </View>

            <BlurView intensity={80} tint="dark" style={isSmallScreen ? styles.detailsCardMobile : styles.detailsCardDesktop}>
              <View style={styles.detailsCardInner}>
                <Text style={styles.sectionTitle}>Event Details</Text>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="calendar-outline" size={18} color="rgba(139, 92, 246, 0.9)" />
                    <Text style={styles.detailLabel}>Date</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatDate(currentEvent.event_date)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="time-outline" size={18} color="rgba(34, 211, 238, 0.9)" />
                    <Text style={styles.detailLabel}>Time</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {currentEvent.start_time?.slice(0, 5)} - {currentEvent.end_time?.slice(0, 5)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="people-outline" size={18} color="rgba(52, 211, 153, 0.9)" />
                    <Text style={styles.detailLabel}>Min Age</Text>
                  </View>
                  <Text style={styles.detailValue}>{currentEvent.min_age}+</Text>
                </View>

                {currentEvent.ticket_limit > 0 && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="ticket-outline" size={18} color="rgba(251, 191, 36, 0.9)" />
                      <Text style={styles.detailLabel}>Ticket Limit</Text>
                    </View>
                    <Text style={styles.detailValue}>{currentEvent.ticket_limit}</Text>
                  </View>
                )}

                {currentEvent.dress_code && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="shirt-outline" size={18} color="rgba(232, 121, 249, 0.9)" />
                      <Text style={styles.detailLabel}>Dress Code</Text>
                    </View>
                    <Text style={styles.detailValue}>{currentEvent.dress_code}</Text>
                  </View>
                )}

              </View>
            </BlurView>
          </View>

          {currentEvent.description && (
            <BlurView intensity={80} tint="dark" style={styles.descriptionCard}>
              <View style={styles.descriptionCardInner}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.eventDescription}>
                  {currentEvent.description}
                </Text>
              </View>
            </BlurView>
          )}
        </ScrollView>

      {user?.role === 'admin' && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.8}
          >
            <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.3)', 'rgba(217, 70, 239, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <View style={styles.fabInner}>
                  <Ionicons name="pencil" size={20} color="white" />
                  <Text style={styles.fabText}>Edit Event</Text>
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <ImageBackground
            source={require('../../../assets/fondo.webp')}
            style={{ flex: 1, backgroundColor: '#0a0a0f' }}
            blurRadius={15}
          >
            <View style={styles.overlay} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <BlurView intensity={60} tint="dark" style={styles.modalContainerFull}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Event</Text>
                    <TouchableOpacity
                      onPress={() => setIsEditModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Event Name *</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.name}
                        onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                        placeholder="Enter event name"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editForm.description}
                        onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                        placeholder="Enter event description"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    {/* Event Image Picker */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Event Image</Text>

                      {selectedImage ? (
                        // New image selected - show preview
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
                      ) : editForm.image ? (
                        // Existing image - show current image with option to change
                        <View style={styles.imagePreviewContainer}>
                          <Image
                            source={{ uri: editForm.image }}
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
                          </View>
                        </View>
                      ) : (
                        // No image - show picker button
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
                            <Text style={styles.imagePickerHint}>JPEG, PNG or WebP - Max 10MB</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Event Date *</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.dateButtonText}>
                          {editForm.event_date || 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="rgba(139, 92, 246, 0.9)" />
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={editForm.event_date ? new Date(editForm.event_date) : new Date()}
                          mode="date"
                          display="default"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                        />
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Start Time *</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.dateButtonText}>
                          {editForm.start_time ? editForm.start_time.slice(0, 5) : 'Select time'}
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

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>End Time *</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.dateButtonText}>
                          {editForm.end_time ? editForm.end_time.slice(0, 5) : 'Select time'}
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

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Ticket Limit</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.ticket_limit}
                        onChangeText={(text) => setEditForm({ ...editForm, ticket_limit: text })}
                        placeholder="Enter ticket limit (0 for unlimited)"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Minimum Age</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.min_age}
                        onChangeText={(text) => setEditForm({ ...editForm, min_age: text })}
                        placeholder="18"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Dress Code</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.dress_code}
                        onChangeText={(text) => setEditForm({ ...editForm, dress_code: text })}
                        placeholder="e.g., Smart casual"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Custom Location</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.custom_location}
                        onChangeText={(text) => setEditForm({ ...editForm, custom_location: text })}
                        placeholder="Optional custom location"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>

                    {/* TICKET TYPES BUTTON */}
                    <TouchableOpacity
                      style={styles.manageTicketsBtn}
                      onPress={() => {
                        setIsEditModalVisible(false);
                        setTimeout(() => setIsTicketTypesModalVisible(true), 300);
                      }}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(34, 211, 238, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.manageTicketsBtnGradient}
                      >
                        <Ionicons name="ticket-outline" size={22} color="rgba(34, 211, 238, 0.9)" />
                        <Text style={styles.manageTicketsBtnText}>Manage Ticket Types</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleEditSubmit}
                      disabled={isUpdatingEvent || isUploadingImage}
                      activeOpacity={0.8}
                      style={styles.glassButtonContainer}
                    >
                      <BlurView intensity={50} tint="dark" style={styles.glassButtonBlur}>
                        <LinearGradient
                          colors={['rgba(139, 92, 246, 0.25)', 'rgba(217, 70, 239, 0.25)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.glassButton}
                        >
                          {isUploadingImage ? (
                            <>
                              <ActivityIndicator color="rgba(139, 92, 246, 1)" />
                              <Text style={[styles.glassButtonText, { color: 'rgba(196, 181, 253, 1)' }]}>Uploading Image...</Text>
                            </>
                          ) : isUpdatingEvent ? (
                            <>
                              <ActivityIndicator color="rgba(139, 92, 246, 1)" />
                              <Text style={[styles.glassButtonText, { color: 'rgba(196, 181, 253, 1)' }]}>Updating Event...</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={20} color="rgba(139, 92, 246, 1)" />
                              <Text style={[styles.glassButtonText, { color: 'rgba(196, 181, 253, 1)' }]}>Update Event</Text>
                            </>
                          )}
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={isDeletingEvent}
                      activeOpacity={0.8}
                      style={[styles.glassButtonContainer, { marginBottom: 30 }]}
                    >
                      <BlurView intensity={50} tint="dark" style={styles.glassButtonBlur}>
                        <LinearGradient
                          colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.2)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.glassButton, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                        >
                          {isDeletingEvent ? (
                            <ActivityIndicator color="rgba(239, 68, 68, 1)" />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={20} color="rgba(239, 68, 68, 0.9)" />
                              <Text style={[styles.glassButtonText, { color: 'rgba(252, 165, 165, 1)' }]}>Delete Event</Text>
                            </>
                          )}
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </BlurView>
            </KeyboardAvoidingView>
          </ImageBackground>
      </Modal>

      {/* TICKET TYPES MODAL */}
      <Modal
        visible={isTicketTypesModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setIsTicketTypesModalVisible(false);
          resetTicketTypeForm();
          setTimeout(() => setIsEditModalVisible(true), 300);
        }}
      >
        <ImageBackground
          source={require('../../../assets/fondo.webp')}
          style={{ flex: 1 }}
          blurRadius={15}
        >
          <View style={styles.overlay} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <BlurView intensity={60} tint="dark" style={styles.modalContainerFull}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsTicketTypesModalVisible(false);
                      resetTicketTypeForm();
                      setTimeout(() => setIsEditModalVisible(true), 300);
                    }}
                    style={styles.backButton}
                  >
                    <Ionicons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Ticket Types</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsTicketTypesModalVisible(false);
                      resetTicketTypeForm();
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                  {/* Fee Notice */}
                  <View style={styles.feeNotice}>
                    <Ionicons name="information-circle" size={18} color="rgba(34, 211, 238, 0.9)" />
                    <Text style={styles.feeNoticeText}>
                      A {FEE_PERCENTAGE}% platform fee will be added to all prices
                    </Text>
                  </View>

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
                                <Text style={styles.ticketTypeDetails}>
                                  {currencySymbol}{ticket.price?.toFixed(2)} ({ticket.availableQuantity}/{ticket.initialQuantity} available)
                                </Text>
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
                              </View>
                            </View>
                          </BlurView>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyTicketTypes}>
                      <Ionicons name="ticket-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                      <Text style={styles.emptyTicketTypesText}>No ticket types yet</Text>
                    </View>
                  )}

                  {/* Ticket Type Form */}
                  <View style={styles.ticketTypeForm}>
                    <Text style={styles.ticketTypeFormTitle}>
                      {editingTicketType ? 'Edit Ticket Type' : 'Add New Ticket Type'}
                    </Text>

                    <View style={styles.formRow}>
                      <View style={[styles.formGroup, { flex: 2 }]}>
                        <Text style={styles.label}>Name *</Text>
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.name}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, name: text })}
                          placeholder="e.g., General, VIP"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Base Price *</Text>
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.price}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, price: text })}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Initial Qty *</Text>
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.initialQuantity}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, initialQuantity: text })}
                          placeholder="100"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          keyboardType="number-pad"
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 2 }]}>
                        <Text style={styles.label}>Benefits</Text>
                        <TextInput
                          style={styles.input}
                          value={ticketTypeForm.benefits}
                          onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, benefits: text })}
                          placeholder="VIP access, drinks..."
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Internal Expenses (cost per ticket)</Text>
                      <TextInput
                        style={styles.input}
                        value={ticketTypeForm.expenses}
                        onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, expenses: text })}
                        placeholder="Cost tracking (not shown to users)"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.label}>Group Ticket</Text>
                      <Switch
                        value={ticketTypeForm.isGroup}
                        onValueChange={(value) => setTicketTypeForm({ ...ticketTypeForm, isGroup: value, hasGenderPricing: false })}
                        trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(139, 92, 246, 0.5)' }}
                        thumbColor={ticketTypeForm.isGroup ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 0.8)'}
                      />
                    </View>

                    {ticketTypeForm.isGroup && (
                      <>
                        <View style={styles.formRow}>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Min People</Text>
                            <TextInput
                              style={styles.input}
                              value={ticketTypeForm.minQuantity}
                              onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, minQuantity: text })}
                              placeholder="2"
                              placeholderTextColor="rgba(255, 255, 255, 0.3)"
                              keyboardType="number-pad"
                            />
                          </View>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Max People</Text>
                            <TextInput
                              style={styles.input}
                              value={ticketTypeForm.maxQuantity}
                              onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, maxQuantity: text })}
                              placeholder="10"
                              placeholderTextColor="rgba(255, 255, 255, 0.3)"
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>

                        <View style={styles.switchRow}>
                          <View>
                            <Text style={styles.label}>Gender-Based Pricing</Text>
                            <Text style={styles.labelSubtext}>Different prices for male/female</Text>
                          </View>
                          <Switch
                            value={ticketTypeForm.hasGenderPricing}
                            onValueChange={(value) => setTicketTypeForm({ ...ticketTypeForm, hasGenderPricing: value })}
                            trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(232, 121, 249, 0.5)' }}
                            thumbColor={ticketTypeForm.hasGenderPricing ? 'rgba(232, 121, 249, 1)' : 'rgba(255, 255, 255, 0.8)'}
                          />
                        </View>

                        {ticketTypeForm.hasGenderPricing && (
                          <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                              <Text style={styles.label}>Male Price *</Text>
                              <TextInput
                                style={styles.input}
                                value={ticketTypeForm.malePrice}
                                onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, malePrice: text })}
                                placeholder="0.00"
                                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                keyboardType="decimal-pad"
                              />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                              <Text style={styles.label}>Female Price *</Text>
                              <TextInput
                                style={styles.input}
                                value={ticketTypeForm.femalePrice}
                                onChangeText={(text) => setTicketTypeForm({ ...ticketTypeForm, femalePrice: text })}
                                placeholder="0.00"
                                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                        )}
                      </>
                    )}

                    <View style={styles.ticketTypeFormButtons}>
                      {editingTicketType && (
                        <TouchableOpacity
                          onPress={resetTicketTypeForm}
                          activeOpacity={0.8}
                          style={styles.glassButtonContainerSmall}
                        >
                          <BlurView intensity={50} tint="dark" style={styles.glassButtonBlur}>
                            <View style={[styles.glassButtonSmall, { borderColor: 'rgba(255, 255, 255, 0.15)' }]}>
                              <Ionicons name="close-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
                              <Text style={[styles.glassButtonTextSmall, { color: 'rgba(255, 255, 255, 0.7)' }]}>Cancel</Text>
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={handleSaveTicketType}
                        disabled={isSavingTicketType}
                        activeOpacity={0.8}
                        style={[styles.glassButtonContainerSmall, { flex: editingTicketType ? 1 : 2 }]}
                      >
                        <BlurView intensity={50} tint="dark" style={styles.glassButtonBlur}>
                          <LinearGradient
                            colors={['rgba(52, 211, 153, 0.25)', 'rgba(16, 185, 129, 0.25)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.glassButtonSmall, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}
                          >
                            {isSavingTicketType ? (
                              <ActivityIndicator color="rgba(52, 211, 153, 1)" size="small" />
                            ) : (
                              <>
                                <Ionicons name={editingTicketType ? 'checkmark' : 'add'} size={18} color="rgba(52, 211, 153, 1)" />
                                <Text style={[styles.glassButtonTextSmall, { color: 'rgba(167, 243, 208, 1)' }]}>
                                  {editingTicketType ? 'Update' : 'Add Ticket Type'}
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </ImageBackground>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  eventTitle: {
    color: 'white',
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  contentMobile: {
    gap: 16,
    marginBottom: 16,
  },
  contentDesktop: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  posterContainerMobile: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  posterContainerDesktop: {
    width: 300,
    height: 450,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  posterBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  detailsCardMobile: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsCardDesktop: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  descriptionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  descriptionCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  eventDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '300',
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  fab: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: 'rgba(139, 92, 246, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fabBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fabGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(15, 15, 25, 0.4)',
  },
  fabText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
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
});