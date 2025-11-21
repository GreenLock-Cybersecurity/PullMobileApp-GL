// app/(tabs)/Scanner/index.js - REDISEÑADO COMPLETO
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTicketStore } from '@/store/useTicketStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function Scanner() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [zoom, setZoom] = useState(0.3);

  const debounceTimeoutRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const { user } = useAuthStore();
  const { isValidating, validateTicket } = useTicketStore();

  useFocusEffect(
    React.useCallback(() => {
      setIsCameraActive(true);
      setScanned(false);
      
      // Animación de línea de escaneo
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      return () => {
        setIsCameraActive(false);
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, [])
  );

  const handleBarcodeScanned = async ({ data }) => {
    const now = Date.now();
    if (scanned || isValidating || now - lastScanTimeRef.current < 2000) {
      return;
    }

    lastScanTimeRef.current = now;
    setScanned(true);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      const result = await validateTicket(data, user);

      if (result.success) {
        Alert.alert(
          '✅ Access Granted',
          `Welcome!\nEvent: ${result.data.event_name}\nTicket: ${result.data.ticket_type}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                lastScanTimeRef.current = 0;
              },
            },
          ]
        );
      } else {
        Alert.alert('❌ Access Denied', result.error || 'Validation failed', [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              lastScanTimeRef.current = 0;
            },
          },
        ]);
      }
    }, 300);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const adjustZoom = (direction) => {
    setZoom((current) => {
      const newZoom = direction === 'in' ? current + 0.1 : current - 0.1;
      return Math.max(0, Math.min(1, newZoom));
    });
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0f', '#1a1a2e']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0f', '#1a1a2e']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <BlurView intensity={60} tint="dark" style={styles.permissionCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.permissionCardInner}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="camera-outline" size={48} color="rgba(167, 139, 250, 0.9)" />
                  </LinearGradient>
                </View>
                
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionSubtitle}>
                  We need camera access to scan QR codes for ticket validation
                </Text>

                <TouchableOpacity
                  onPress={requestPermission}
                  activeOpacity={0.8}
                  style={{ marginTop: 24 }}
                >
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.9)', 'rgba(217, 70, 239, 0.9)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.permissionButton}
                  >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0f', '#1a1a2e']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.centerContainer}>
            <BlurView intensity={60} tint="dark" style={styles.webCard}>
              <View style={styles.webCardInner}>
                <Ionicons name="qr-code-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.webTitle}>QR Scanner</Text>
                <Text style={styles.webSubtitle}>
                  Camera access is not available on web. Please use a mobile device for QR code scanning.
                </Text>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  return (
    <View style={styles.container}>
      {isCameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          zoom={zoom}
          onBarcodeScanned={scanned || isValidating ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      )}

      {/* Overlay oscuro con transparencia en el centro */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.overlayTop} />
        
        <View style={styles.scannerRow}>
          <View style={styles.overlaySide} />
          
          {/* Frame de escaneo */}
          <View style={styles.scanFrame}>
            <View style={[
              styles.scanFrameBorder,
              { borderColor: scanned || isValidating ? '#f59e0b' : 'rgba(139, 92, 246, 0.8)' }
            ]}>
              {/* Corners */}
              <View style={[styles.cornerTL, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerTR, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerBL, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerBR, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />

              {/* Línea de escaneo animada */}
              {!scanned && !isValidating && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLineTranslateY }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(139, 92, 246, 0.8)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.scanLineGradient}
                  />
                </Animated.View>
              )}
            </View>
          </View>
          
          <View style={styles.overlaySide} />
        </View>
        
        <View style={styles.overlayBottom} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BlurView intensity={40} tint="dark" style={styles.headerBlur}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSubtitle}>
              Position the QR code within the frame
            </Text>
          </BlurView>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => adjustZoom('out')}
              disabled={isValidating}
              activeOpacity={0.8}
              style={styles.controlButton}
            >
              <BlurView intensity={40} tint="dark" style={styles.controlButtonBlur}>
                <Ionicons name="remove" size={20} color="white" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => adjustZoom('in')}
              disabled={isValidating}
              activeOpacity={0.8}
              style={styles.controlButton}
            >
              <BlurView intensity={40} tint="dark" style={styles.controlButtonBlur}>
                <Ionicons name="add" size={20} color="white" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleCameraFacing}
              disabled={isValidating}
              activeOpacity={0.8}
              style={styles.controlButton}
            >
              <BlurView intensity={40} tint="dark" style={styles.controlButtonBlur}>
                <Ionicons name="camera-reverse" size={20} color="white" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Status indicator */}
          {(isValidating || scanned) && (
            <BlurView intensity={60} tint="dark" style={styles.statusBadge}>
              <LinearGradient
                colors={
                  isValidating
                    ? ['rgba(139, 92, 246, 0.4)', 'rgba(217, 70, 239, 0.4)']
                    : ['rgba(245, 158, 11, 0.4)', 'rgba(251, 191, 36, 0.4)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statusBadgeInner}>
                <Ionicons
                  name={isValidating ? 'hourglass-outline' : 'scan-outline'}
                  size={16}
                  color="white"
                />
                <Text style={styles.statusText}>
                  {isValidating ? 'Validating...' : 'Processing...'}
                </Text>
              </View>
            </BlurView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    marginTop: 16,
  },
  
  // Permission Card
  permissionCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  permissionCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  permissionTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },

  // Web Card
  webCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  webCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  webTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  webSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scanner Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerRow: {
    flexDirection: 'row',
    height: 280,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanFrame: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameBorder: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderRadius: 24,
    position: 'relative',
  },

  // Corners
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 24,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 24,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 24,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 24,
  },

  // Scan Line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineGradient: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  headerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },

  // Controls
  controls: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  controlButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Status Badge
  statusBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBadgeInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
});