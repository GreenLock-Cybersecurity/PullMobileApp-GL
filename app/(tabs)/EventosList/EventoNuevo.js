// app/(tabs)/EventosList/EventoNuevo.js - COMPLETO
import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EventoNuevo() {
  const router = useRouter();
  const { createEvent, isCreatingEvent } = useDataStore();

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
    vip_enabled: false,
    custom_location: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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

  const handleSubmit = async () => {
    // Validación
    if (!formData.name || !formData.event_date || !formData.start_time || !formData.end_time) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Date, Start Time, End Time)');
      return;
    }

    const result = await createEvent({
      name: formData.name,
      description: formData.description,
      image: formData.image,
      event_date: formData.event_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : 0,
      dress_code: formData.dress_code,
      min_age: formData.min_age ? parseInt(formData.min_age) : 18,
      vip_enabled: formData.vip_enabled,
      custom_location: formData.custom_location,
    });

    if (result.success) {
      Alert.alert('Success', 'Event created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to create event');
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/fondo.png')}
      style={styles.background}
      blurRadius={24}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create New Event</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Form */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
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
                    <Text style={styles.label}>Description</Text>
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

                  {/* Image URL */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Event Image URL</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.image}
                      onChangeText={(text) => setFormData({ ...formData, image: text })}
                      placeholder="https://example.com/event-image.jpg"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
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
                    <Text style={styles.label}>Ticket Limit</Text>
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
                    <Text style={styles.label}>Minimum Age</Text>
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
                    <Text style={styles.label}>Dress Code</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.dress_code}
                      onChangeText={(text) => setFormData({ ...formData, dress_code: text })}
                      placeholder="e.g., Smart casual, Formal, etc."
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    />
                  </View>

                  {/* VIP Enabled */}
                  <View style={styles.formGroup}>
                    <View style={styles.switchContainer}>
                      <View>
                        <Text style={styles.label}>VIP Access</Text>
                        <Text style={styles.switchDescription}>
                          Enable VIP tables and reservations
                        </Text>
                      </View>
                      <Switch
                        value={formData.vip_enabled}
                        onValueChange={(value) =>
                          setFormData({ ...formData, vip_enabled: value })
                        }
                        trackColor={{ false: '#444', true: 'rgba(139, 92, 246, 0.6)' }}
                        thumbColor={formData.vip_enabled ? 'rgba(139, 92, 246, 0.9)' : '#888'}
                      />
                    </View>
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

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.submitButtonContainer}
                    onPress={handleSubmit}
                    disabled={isCreatingEvent}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.9)', 'rgba(217, 70, 239, 0.9)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButton}
                    >
                      {isCreatingEvent ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="white" />
                          <Text style={styles.submitButtonText}>Create Event</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  submitButtonContainer: {
    marginTop: 10,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});