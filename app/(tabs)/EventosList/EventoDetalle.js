// app/(tabs)/EventosList/EventoDetalle.js - COMPLETO CORREGIDO
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

export default function EventoDetalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

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
    vip_enabled: false,
    custom_location: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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
        vip_enabled: currentEvent.vip_enabled || false,
        custom_location: currentEvent.custom_location || '',
      });
    }
  }, [currentEvent, isEditModalVisible]);

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

  const handleEditSubmit = async () => {
    if (!editForm.name || !editForm.event_date || !editForm.start_time || !editForm.end_time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const result = await updateEvent(id, {
      name: editForm.name,
      description: editForm.description,
      image: editForm.image,
      event_date: editForm.event_date,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      ticket_limit: editForm.ticket_limit ? parseInt(editForm.ticket_limit) : 0,
      dress_code: editForm.dress_code,
      min_age: editForm.min_age ? parseInt(editForm.min_age) : 18,
      vip_enabled: editForm.vip_enabled,
      custom_location: editForm.custom_location,
    });

    if (result.success) {
      Alert.alert('Success', 'Event updated successfully');
      setIsEditModalVisible(false);
      onRefresh();
    } else {
      Alert.alert('Error', result.error || 'Failed to update event');
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
        source={require('../../../assets/fondo.png')}
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
        source={require('../../../assets/fondo.png')}
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
        source={require('../../../assets/fondo.png')}
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
    : require('../../../assets/fondo.png');

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      blurRadius={20}
    >
      <View style={styles.overlayLight} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
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

                <View style={[styles.detailRow, styles.detailRowLast]}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="star-outline" size={18} color="rgba(249, 115, 22, 0.9)" />
                    <Text style={styles.detailLabel}>VIP Enabled</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {currentEvent.vip_enabled ? 'Yes' : 'No'}
                  </Text>
                </View>
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

        {user?.role === 'staff' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.9)', 'rgba(217, 70, 239, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="pencil" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
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

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Image URL</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.image}
                        onChangeText={(text) => setEditForm({ ...editForm, image: text })}
                        placeholder="https://example.com/image.jpg"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        autoCapitalize="none"
                      />
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
                      <View style={styles.switchContainer}>
                        <Text style={styles.label}>VIP Enabled</Text>
                        <Switch
                          value={editForm.vip_enabled}
                          onValueChange={(value) =>
                            setEditForm({ ...editForm, vip_enabled: value })
                          }
                          trackColor={{ false: '#444', true: 'rgba(139, 92, 246, 0.6)' }}
                          thumbColor={editForm.vip_enabled ? 'rgba(139, 92, 246, 0.9)' : '#888'}
                        />
                      </View>
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

                    <TouchableOpacity
                      style={styles.submitButtonContainer}
                      onPress={handleEditSubmit}
                      disabled={isUpdatingEvent}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(139, 92, 246, 0.9)', 'rgba(217, 70, 239, 0.9)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitButton}
                      >
                        {isUpdatingEvent ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.submitButtonText}>Update Event</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButtonContainer}
                      onPress={handleDelete}
                      disabled={isDeletingEvent}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.9)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.deleteButton}
                      >
                        {isDeletingEvent ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={20} color="white" />
                            <Text style={styles.deleteButtonText}>Delete Event</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
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
  overlayLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
});