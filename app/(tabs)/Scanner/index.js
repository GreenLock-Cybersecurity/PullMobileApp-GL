// app/(tabs)/Scanner/index.js - Clean Modern Design
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
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTicketStore } from '@/store/useTicketStore';
import { BlurView } from 'expo-blur';
import BackgroundGlow from '@/components/BackgroundGlow';

const { width, height } = Dimensions.get('window');

export default function Scanner() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanResult, setScanResult] = useState(null);

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

  // Loading state
  if (!permission) {
    return (
      <BackgroundGlow>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="rgb(168, 85, 255)" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </BackgroundGlow>
    );
  }

  // Permission request
  if (!permission.granted) {
    return (
      <BackgroundGlow>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <View style={styles.permissionIcon}>
              <Ionicons name="camera-outline" size={48} color="rgb(168, 85, 255)" />
            </View>

            <Text style={styles.permissionTitle}>Camera Permission</Text>
            <Text style={styles.permissionSubtitle}>
              We need camera access to scan QR codes for ticket validation
            </Text>

            <TouchableOpacity
              onPress={requestPermission}
              activeOpacity={0.8}
              style={styles.permissionButton}
            >
              <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                <View style={styles.permissionButtonInner}>
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <BackgroundGlow>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <View style={styles.permissionIcon}>
              <Ionicons name="qr-code-outline" size={48} color="rgb(168, 85, 255)" />
            </View>
            <Text style={styles.permissionTitle}>QR Scanner</Text>
            <Text style={styles.permissionSubtitle}>
              Camera access is not available on web. Please use a mobile device for QR code scanning.
            </Text>
          </View>
        </SafeAreaView>
      </BackgroundGlow>
    );
  }

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

      {/* Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.overlayTop} />

        <View style={styles.scannerRow}>
          <View style={styles.overlaySide} />

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={styles.scanFrameBorder}>
              <View style={[styles.cornerTL, { borderColor: scanned || isValidating ? '#f59e0b' : 'rgb(168, 85, 255)' }]} />
              <View style={[styles.cornerTR, { borderColor: scanned || isValidating ? '#f59e0b' : 'rgb(168, 85, 255)' }]} />
              <View style={[styles.cornerBL, { borderColor: scanned || isValidating ? '#f59e0b' : 'rgb(168, 85, 255)' }]} />
              <View style={[styles.cornerBR, { borderColor: scanned || isValidating ? '#f59e0b' : 'rgb(168, 85, 255)' }]} />
            </View>
          </View>

          <View style={styles.overlaySide} />
        </View>

        <View style={styles.overlayBottom} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.safeAreaCamera}>
        <View style={styles.header}>
          <BlurView intensity={60} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Scan QR Code</Text>
              <Text style={styles.headerSubtitle}>
                Position the QR code within the frame
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Status indicator */}
          {(isValidating || scanned) && (
            <View style={styles.statusBadge}>
              <Ionicons
                name={isValidating ? 'hourglass-outline' : 'scan-outline'}
                size={16}
                color="rgb(168, 85, 255)"
              />
              <Text style={styles.statusText}>
                {isValidating ? 'Validating...' : 'Processing...'}
              </Text>
            </View>
          )}

          {/* Flashlight Button */}
          <TouchableOpacity
            onPress={toggleTorch}
            disabled={isValidating}
            activeOpacity={0.8}
            style={styles.controlButton}
          >
            <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
              <View style={[
                styles.controlButtonInner,
                torchEnabled && styles.controlButtonActive
              ]}>
                <Ionicons
                  name={torchEnabled ? "flashlight" : "flashlight-outline"}
                  size={24}
                  color={torchEnabled ? "#fbbf24" : "white"}
                />
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Result Overlay */}
      {scanResult && (
        <Animated.View style={[styles.resultOverlay, { opacity: resultOpacity }]}>
          <BlurView intensity={80} tint="dark" style={styles.resultCard}>
            <View style={styles.resultCardInner}>
              {/* Bottle Voucher Result */}
              {scanResult.type === 'bottle' ? (
                <>
                  <View style={[
                    styles.resultIconContainer,
                    {
                      backgroundColor: scanResult.success ? 'rgba(212, 175, 55, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                      borderColor: scanResult.success ? 'rgba(212, 175, 55, 0.6)' : 'rgba(239, 68, 68, 0.5)',
                    }
                  ]}>
                    <Ionicons
                      name={scanResult.success ? 'wine' : 'close-circle'}
                      size={48}
                      color={scanResult.success ? 'rgb(212, 175, 55)' : 'rgb(239, 68, 68)'}
                    />
                  </View>

                  <Text style={[
                    styles.resultTitle,
                    { color: scanResult.success ? 'rgb(212, 175, 55)' : 'rgb(239, 68, 68)' }
                  ]}>
                    {scanResult.success ? 'Botellas Canjeadas' : 'Canje Fallido'}
                  </Text>

                  {scanResult.success && scanResult.data && (
                    <>
                      <Text style={styles.bottleHostName}>{scanResult.data.host_name}</Text>
                      <Text style={styles.resultEventName}>{scanResult.data.event_name}</Text>

                      {/* Bottles List */}
                      <ScrollView style={styles.bottlesScrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.bottlesList}>
                          {scanResult.data.bottles?.map((bottle, index) => (
                            <View key={index} style={styles.bottleItem}>
                              {bottle.image ? (
                                <Image
                                  source={{ uri: bottle.image }}
                                  style={styles.bottleImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <View style={styles.bottleImagePlaceholder}>
                                  <Ionicons name="wine-outline" size={24} color="rgba(212, 175, 55, 0.5)" />
                                </View>
                              )}
                              <View style={styles.bottleInfo}>
                                <Text style={styles.bottleName}>{bottle.name}</Text>
                                {bottle.brand && (
                                  <Text style={styles.bottleBrand}>{bottle.brand}</Text>
                                )}
                              </View>
                              <View style={styles.bottleQtyBadge}>
                                <Text style={styles.bottleQtyText}>x{bottle.quantity}</Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {/* Mixers */}
                        {scanResult.data.mixers?.length > 0 && (
                          <View style={styles.mixersSection}>
                            <Text style={styles.mixersTitle}>Mixers incluidos</Text>
                            <Text style={styles.mixersList}>
                              {scanResult.data.mixers.map(m =>
                                m.quantity > 1 ? `${m.name} x${m.quantity}` : m.name
                              ).join(' • ')}
                            </Text>
                          </View>
                        )}
                      </ScrollView>

                      <Text style={styles.resultMessage}>{scanResult.data.message}</Text>
                    </>
                  )}

                  {!scanResult.success && (
                    <>
                      <Text style={styles.resultError}>
                        {scanResult.error || 'Voucher inválido o ya canjeado'}
                      </Text>
                      {scanResult.details && (
                        <Text style={[styles.resultError, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
                          {scanResult.details}
                        </Text>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Regular Ticket Result */
                <>
                  <View style={[
                    styles.resultIconContainer,
                    {
                      backgroundColor: scanResult.success ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderColor: scanResult.success ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    }
                  ]}>
                    <Ionicons
                      name={scanResult.success ? 'checkmark-circle' : 'close-circle'}
                      size={48}
                      color={scanResult.success ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)'}
                    />
                  </View>

                  <Text style={[
                    styles.resultTitle,
                    { color: scanResult.success ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)' }
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
                </>
              )}

              <TouchableOpacity
                onPress={hideResultOverlay}
                activeOpacity={0.8}
                style={styles.okButtonContainer}
              >
                <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                  <View style={[
                    styles.okButtonInner,
                    {
                      backgroundColor: scanResult.type === 'bottle'
                        ? (scanResult.success ? 'rgba(212, 175, 55, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                        : (scanResult.success ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                      borderColor: scanResult.type === 'bottle'
                        ? (scanResult.success ? 'rgba(212, 175, 55, 0.4)' : 'rgba(239, 68, 68, 0.4)')
                        : (scanResult.success ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'),
                    }
                  ]}>
                    <Text style={[
                      styles.okButtonText,
                      { color: scanResult.type === 'bottle'
                        ? (scanResult.success ? 'rgb(212, 175, 55)' : 'rgb(239, 68, 68)')
                        : (scanResult.success ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)')
                      }
                    ]}>
                      Escanear Otro
                    </Text>
                  </View>
                </BlurView>
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
  },
  safeAreaCamera: {
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
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '400',
    marginTop: 16,
  },

  // Permission Screen
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(168, 85, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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

  // Corners
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 50,
    height: 50,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderTopLeftRadius: 24,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 50,
    height: 50,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderTopRightRadius: 24,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 50,
    height: 50,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderBottomLeftRadius: 24,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 50,
    height: 50,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderBottomRightRadius: 24,
  },

  // Header
  header: {
    paddingTop: 16,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  headerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerContent: {
    backgroundColor: 'rgba(6, 6, 10, 0.65)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },

  // Controls
  controls: {
    paddingBottom: 120,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  controlButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 6, 10, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 32,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(168, 85, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
    borderRadius: 20,
  },
  statusText: {
    color: 'rgb(168, 85, 255)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Result Overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
  },
  resultCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.95)',
    padding: 32,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultEventName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
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
  okButtonContainer: {
    marginTop: 24,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  okButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottle Voucher Styles
  bottleHostName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  bottlesScrollView: {
    maxHeight: 200,
    width: '100%',
    marginTop: 16,
  },
  bottlesList: {
    gap: 10,
  },
  bottleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  bottleImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottleImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bottleName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  bottleBrand: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  bottleQtyBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  bottleQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgb(212, 175, 55)',
  },
  mixersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mixersTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  mixersList: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
