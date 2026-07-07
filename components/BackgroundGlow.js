import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function BackgroundGlow({ children, style }) {
  return (
    <View style={[styles.container, style]}>
      {/* Background with gradient effects */}
      <View style={styles.background}>
        {/* Base dark background */}
        <View style={styles.baseBg} />

        {/* Top purple radial glow - diffused */}
        <LinearGradient
          colors={[
            'rgba(168, 85, 255, 0.12)',
            'rgba(168, 85, 255, 0.08)',
            'rgba(168, 85, 255, 0.04)',
            'rgba(168, 85, 255, 0.01)',
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.15, 0.3, 0.5, 0.7, 1]}
          style={styles.topGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Bottom purple radial glow - diffused */}
        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            'rgba(168, 85, 255, 0.01)',
            'rgba(168, 85, 255, 0.05)',
            'rgba(168, 85, 255, 0.1)',
            'rgba(168, 85, 255, 0.15)',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 0.85, 1]}
          style={styles.bottomGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  baseBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0f',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
});
