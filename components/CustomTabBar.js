import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const scaleAnimations = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const user = useAuthStore((state) => state.user);
  const { pendingIndividualCount, pendingGroupCount, fetchPendingCounts } = useDataStore();
  const hasPendingBookings = pendingIndividualCount > 0 || pendingGroupCount > 0;

  // Fetch pending counts on mount
  useEffect(() => {
    if (user?.venue_id_real) {
      fetchPendingCounts(user.venue_id_real);
    }
  }, [user?.venue_id_real]);

  // Hide tab bar on detail screens
  const hideTabBar = segments.length > 2 && (
    segments.includes('EventoDetalle') ||
    segments.includes('EventoNuevo') ||
    segments.includes('ReservaDetalle') ||
    segments.includes('GroupReservaDetalle') ||
    segments.includes('GroupReservasList') ||
    segments.includes('EmpleadoNuevo') ||
    segments.includes('EmpleadoEditar')
  );

  const handlePress = (route, index, isFocused) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      // Animate the pressed tab
      Animated.sequence([
        Animated.timing(scaleAnimations[index], {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimations[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (isFocused) {
        // If already on this tab but on a nested screen, go back to the tab's index
        navigation.navigate(route.name, { screen: 'index' });
      } else {
        // Navigate to the tab
        navigation.navigate(route.name, route.params);
      }
    }
  };

  useEffect(() => {
    state.routes.forEach((route, index) => {
      const isFocused = state.index === index;
      Animated.spring(scaleAnimations[index], {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        friction: 4,
      }).start();
    });
  }, [state.index]);

  // Return null after all hooks have been called
  if (hideTabBar) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={60} tint="dark" style={[styles.blurContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            // Skip hidden tabs
            if (options.href === null) return null;

            const icon = options.tabBarIcon;
            const isBookingsTab = route.name === 'ReservasList';
            const showPendingDot = isBookingsTab && hasPendingBookings;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handlePress(route, index, isFocused)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      transform: [{ scale: scaleAnimations[index] }],
                    },
                  ]}
                >
                  {icon &&
                    icon({
                      size: 26,
                      color: isFocused ? '#a78bfa' : 'rgba(255, 255, 255, 0.9)',
                      focused: isFocused,
                    })}
                  {showPendingDot && <View style={styles.pendingDot} />}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
    backgroundColor: 'rgba(6, 6, 10, 0.65)',
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pendingDot: {
    position: 'absolute',
    top: 30,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
});
