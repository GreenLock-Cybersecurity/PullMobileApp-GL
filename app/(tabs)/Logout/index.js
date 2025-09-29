import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';

export default function Logout() {
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center p-6">
        <View className="bg-secondary rounded-full p-6 mb-6">
          <Ionicons name="person" size={48} color="#10b981" />
        </View>

        <Text className="text-foreground text-2xl font-bold mb-2">
          {user?.name}
        </Text>
        <Text className="text-muted-foreground text-base mb-1">
          {user?.email}
        </Text>
        <Text className="text-primary text-sm font-medium mb-8 capitalize">
          {user?.role} Account
        </Text>

        <View className="w-full max-w-sm">
          <TouchableOpacity
            className="bg-destructive rounded-lg py-4 mb-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#ffffff" />
              <Text className="text-destructive-foreground text-center font-semibold text-base ml-2">
                Logout
              </Text>
            </View>
          </TouchableOpacity>

          <Text className="text-muted-foreground text-sm text-center">
            You will be redirected to the login screen
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}