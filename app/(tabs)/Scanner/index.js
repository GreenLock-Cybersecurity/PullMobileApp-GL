// app/(tabs)/Scanner/index.js - REDISEÑADO COMPLETO
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
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
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { success: bool, data: obj, error: string }

  const debounceTimeoutRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

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

  const showResultOverlay = (result) => {
    setScanResult(result);
    resultOpacity.setValue(0);
    Animated.timing(resultOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideResultOverlay = () => {
    Animated.timing(resultOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setScanResult(null);
      setScanned(false);
      lastScanTimeRef.current = 0;
    });
  };

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
      showResultOverlay(result);
    }, 300);
  };

  const toggleTorch = () => {
    setTorchEnabled((current) => !current);
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
          enableTorch={torchEnabled}
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
            <View style={styles.scanFrameBorder}>
              {/* Corners */}
              <View style={[styles.cornerTL, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerTR, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerBL, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
              <View style={[styles.cornerBR, { borderColor: scanned || isValidating ? '#f59e0b' : '#8b5cf6' }]} />
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

        {/* Flashlight Button - positioned higher */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={toggleTorch}
            disabled={isValidating}
            activeOpacity={0.8}
            style={styles.controlButton}
          >
            <BlurView intensity={40} tint="dark" style={[
              styles.controlButtonBlur,
              torchEnabled && styles.controlButtonActive
            ]}>
              <Ionicons
                name={torchEnabled ? "flashlight" : "flashlight-outline"}
                size={24}
                color={torchEnabled ? "#fbbf24" : "white"}
              />
            </BlurView>
          </TouchableOpacity>

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

      {/* Result Overlay */}
      {scanResult && (
        <Animated.View style={[styles.resultOverlay, { opacity: resultOpacity }]}>
          <BlurView intensity={90} tint="dark" style={styles.resultCard}>
            <LinearGradient
              colors={
                scanResult.success
                  ? ['rgba(34, 197, 94, 0.15)', 'rgba(16, 185, 129, 0.05)']
                  : ['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.05)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.resultCardInner}>
              <View style={[
                styles.resultIconContainer,
                { backgroundColor: scanResult.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
              ]}>
                <Ionicons
                  name={scanResult.success ? 'checkmark-circle' : 'close-circle'}
                  size={56}
                  color={scanResult.success ? '#22c55e' : '#ef4444'}
                />
              </View>
              <Text style={[
                styles.resultTitle,
                { color: scanResult.success ? '#22c55e' : '#ef4444' }
              ]}>
                {scanResult.success ? 'Acceso Permitido' : 'Acceso Denegado'}
              </Text>
              {scanResult.success && scanResult.data && (
                <>
                  <Text style={styles.resultEventName}>{scanResult.data.event_name}</Text>
                  <Text style={styles.resultMessage}>{scanResult.data.message}</Text>
                </>
              )}
              {!scanResult.success && (
                <Text style={styles.resultError}>
                  {scanResult.error || 'Ticket inválido o ya validado'}
                </Text>
              )}

              <TouchableOpacity
                onPress={hideResultOverlay}
                activeOpacity={0.8}
                style={{ marginTop: 24, width: '100%' }}
              >
                <LinearGradient
                  colors={
                    scanResult.success
                      ? ['rgba(34, 197, 94, 0.8)', 'rgba(16, 185, 129, 0.8)']
                      : ['rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.okButton}
                >
                  <Text style={styles.okButtonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}
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
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scannerRow: {
    flexDirection: 'row',
    height: 280,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'transparent',
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
    borderRadius: 24,
    position: 'relative',
  },

  // Corners - thicker lines
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 50,
    height: 50,
    borderLeftWidth: 6,
    borderTopWidth: 6,
    borderTopLeftRadius: 24,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 50,
    height: 50,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderTopRightRadius: 24,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 50,
    height: 50,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
    borderBottomLeftRadius: 24,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 50,
    height: 50,
    borderRightWidth: 6,
    borderBottomWidth: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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

  // Controls - positioned higher
  controls: {
    paddingBottom: 140,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  controlButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  controlButtonActive: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
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

  // Result Overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.9)',
    padding: 32,
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultEventName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  resultError: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  okButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  okButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});