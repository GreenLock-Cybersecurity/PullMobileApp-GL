import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDataStore } from '@/store/useDataStore';

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  price: z.number().min(0, 'Price must be positive'),
  max: z.number().min(1, 'Max must be at least 1'),
  commission: z.number().min(0, 'Commission must be positive'),
});

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  description: z.string().min(1, 'Description is required'),
  accessType: z.enum(['public', 'private']),
  maxTickets: z.number().min(1, 'Max tickets must be at least 1'),
  minAge: z.number().min(0, 'Min age must be positive'),
  ticketTypes: z.array(ticketTypeSchema).min(1, 'At least one ticket type is required'),
});

export default function EventoNuevo() {
  const router = useRouter();
  const addEvent = useDataStore((state) => state.addEvent);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      date: '',
      startTime: '20:00',
      endTime: '06:00',
      description: '',
      accessType: 'public',
      maxTickets: 100,
      minAge: 18,
      ticketTypes: [
        { name: 'General', description: 'General admission', price: 25, max: 80, commission: 2.5 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticketTypes',
  });

  const onSubmit = (data) => {
    const newEvent = {
      ...data,
      poster: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      ticketTypes: data.ticketTypes.map((ticket, index) => ({
        ...ticket,
        id: (index + 1).toString(),
      })),
    };

    addEvent(newEvent);
    Alert.alert('Success', 'Event created successfully', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const addTicketType = () => {
    if (fields.length < 4) {
      append({ name: '', description: '', price: 0, max: 0, commission: 0 });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="space-y-4">
          <View>
            <Text className="text-foreground text-sm font-medium mb-2">Event Name</Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Enter event name"
                  placeholderTextColor="#6b7280"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.name && (
              <Text className="text-destructive text-sm mt-1">{errors.name.message}</Text>
            )}
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium mb-2">Date</Text>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <TextInput
                    className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6b7280"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                )}
              />
              {errors.date && (
                <Text className="text-destructive text-sm mt-1">{errors.date.message}</Text>
              )}
            </View>
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium mb-2">Start Time</Text>
              <Controller
                control={control}
                name="startTime"
                render={({ field }) => (
                  <TextInput
                    className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="HH:MM"
                    placeholderTextColor="#6b7280"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium mb-2">End Time</Text>
              <Controller
                control={control}
                name="endTime"
                render={({ field }) => (
                  <TextInput
                    className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="HH:MM"
                    placeholderTextColor="#6b7280"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                )}
              />
            </View>
          </View>

          <View>
            <Text className="text-foreground text-sm font-medium mb-2">Description</Text>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextInput
                  className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Event description"
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={3}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium mb-2">Max Tickets</Text>
              <Controller
                control={control}
                name="maxTickets"
                render={({ field }) => (
                  <TextInput
                    className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="100"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={field.value?.toString()}
                    onChangeText={(text) => field.onChange(parseInt(text) || 0)}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium mb-2">Min Age</Text>
              <Controller
                control={control}
                name="minAge"
                render={({ field }) => (
                  <TextInput
                    className="bg-secondary border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="18"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={field.value?.toString()}
                    onChangeText={(text) => field.onChange(parseInt(text) || 0)}
                  />
                )}
              />
            </View>
          </View>

          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-foreground text-lg font-semibold">Ticket Types</Text>
              {fields.length < 4 && (
                <TouchableOpacity
                  className="bg-primary rounded-lg px-3 py-1"
                  onPress={addTicketType}
                >
                  <Text className="text-primary-foreground text-sm">Add Type</Text>
                </TouchableOpacity>
              )}
            </View>

            {fields.map((field, index) => (
              <View key={field.id} className="bg-secondary rounded-lg p-4 mb-4 border border-border">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-foreground font-medium">Ticket Type #{index + 1}</Text>
                  {fields.length > 1 && (
                    <TouchableOpacity
                      onPress={() => remove(index)}
                      className="bg-destructive rounded-full w-6 h-6 items-center justify-center"
                    >
                      <Text className="text-destructive-foreground text-sm">×</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="space-y-3">
                  <Controller
                    control={control}
                    name={`ticketTypes.${index}.name`}
                    render={({ field }) => (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Ticket name"
                        placeholderTextColor="#6b7280"
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name={`ticketTypes.${index}.description`}
                    render={({ field }) => (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Description"
                        placeholderTextColor="#6b7280"
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />

                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Controller
                        control={control}
                        name={`ticketTypes.${index}.price`}
                        render={({ field }) => (
                          <TextInput
                            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                            placeholder="Price"
                            placeholderTextColor="#6b7280"
                            keyboardType="numeric"
                            value={field.value?.toString()}
                            onChangeText={(text) => field.onChange(parseFloat(text) || 0)}
                          />
                        )}
                      />
                    </View>
                    <View className="flex-1">
                      <Controller
                        control={control}
                        name={`ticketTypes.${index}.max`}
                        render={({ field }) => (
                          <TextInput
                            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                            placeholder="Max"
                            placeholderTextColor="#6b7280"
                            keyboardType="numeric"
                            value={field.value?.toString()}
                            onChangeText={(text) => field.onChange(parseInt(text) || 0)}
                          />
                        )}
                      />
                    </View>
                    <View className="flex-1">
                      <Controller
                        control={control}
                        name={`ticketTypes.${index}.commission`}
                        render={({ field }) => (
                          <TextInput
                            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                            placeholder="Commission"
                            placeholderTextColor="#6b7280"
                            keyboardType="numeric"
                            value={field.value?.toString()}
                            onChangeText={(text) => field.onChange(parseFloat(text) || 0)}
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="flex-row space-x-4 mt-6">
            <TouchableOpacity
              className="flex-1 bg-secondary border border-border rounded-lg py-3"
              onPress={() => router.back()}
            >
              <Text className="text-foreground text-center font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-lg py-3"
              onPress={handleSubmit(onSubmit)}
            >
              <Text className="text-primary-foreground text-center font-medium">Create Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}