import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTicketStore } from '@/store/useTicketStore';

export default function Scanner() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [zoom, setZoom] = useState(0.3);

  const debounceTimeoutRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  const { user } = useAuthStore();
  const { isValidating, validateTicket } = useTicketStore();

  useFocusEffect(
    React.useCallback(() => {
      setIsCameraActive(true);
      setScanned(false);
      return () => {
        setIsCameraActive(false);
        // Limpiar timeout al salir
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, [])
  );

  const handleBarcodeScanned = async ({ data }) => {
    // Control de múltiples escaneos
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
        console.log('Validation error:', result.error); // Para debug
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
      return Math.max(0, Math.min(1, newZoom)); // Entre 0 y 1
    });
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg">Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="camera-outline" size={64} color="#6b7280" />
          <Text className="text-foreground text-xl font-semibold mb-4 text-center">
            Camera Permission Required
          </Text>
          <Text className="text-muted-foreground text-base mb-6 text-center">
            We need your permission to access the camera for QR code scanning
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg px-6 py-3"
            onPress={requestPermission}
          >
            <Text className="text-primary-foreground font-medium">
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {Platform.OS !== 'web' ? (
          <View className="flex-1 relative">
            {isCameraActive && (
              <CameraView
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                facing={facing}
                zoom={zoom} // Agregar zoom para evitar gran angular
                onBarcodeScanned={
                  scanned || isValidating ? undefined : handleBarcodeScanned
                }
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
            )}

            {/* Overlay con frame de escaneo */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 1,
              }}
              pointerEvents="box-none"
            >
              {/* Header Section */}
              <View className="flex-1 justify-center items-center px-6">
                <Text className="text-white text-xl font-semibold mb-2 text-center">
                  Scan QR Code
                </Text>
                <Text
                  className="text-white text-base text-center"
                  style={{ opacity: 0.9 }}
                >
                  Position the QR code within the frame to scan
                </Text>
              </View>

              {/* Scanner Frame Section */}
              <View className="flex-1 justify-center items-center">
                <View
                  style={{
                    width: 256,
                    height: 256,
                    borderWidth: 2,
                    borderColor:
                      scanned || isValidating ? '#fbbf24' : '#10b981',
                    borderRadius: 16,
                    position: 'relative',
                    backgroundColor: 'transparent',
                  }}
                >
                  {/* Corner indicators */}
                  <View
                    style={{
                      position: 'absolute',
                      top: -1,
                      left: -1,
                      width: 32,
                      height: 32,
                      borderLeftWidth: 4,
                      borderTopWidth: 4,
                      borderColor:
                        scanned || isValidating ? '#fbbf24' : '#10b981',
                      borderTopLeftRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: -1,
                      width: 32,
                      height: 32,
                      borderRightWidth: 4,
                      borderTopWidth: 4,
                      borderColor:
                        scanned || isValidating ? '#fbbf24' : '#10b981',
                      borderTopRightRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: -1,
                      width: 32,
                      height: 32,
                      borderLeftWidth: 4,
                      borderBottomWidth: 4,
                      borderColor:
                        scanned || isValidating ? '#fbbf24' : '#10b981',
                      borderBottomLeftRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 32,
                      height: 32,
                      borderRightWidth: 4,
                      borderBottomWidth: 4,
                      borderColor:
                        scanned || isValidating ? '#fbbf24' : '#10b981',
                      borderBottomRightRadius: 8,
                    }}
                  />

                  {/* Línea de escaneo animada cuando está procesando */}
                  {(scanned || isValidating) && (
                    <View
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: '#fbbf24',
                        opacity: 0.8,
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Controls Section */}
              <View className="flex-1 justify-center items-center">
                {/* Controles de zoom */}
                <View className="flex-row mb-4 space-x-4">
                  <TouchableOpacity
                    className="bg-secondary rounded-full p-3"
                    onPress={() => adjustZoom('out')}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    disabled={isValidating}
                  >
                    <Ionicons name="remove" size={20} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-secondary rounded-full p-3"
                    onPress={() => adjustZoom('in')}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    disabled={isValidating}
                  >
                    <Ionicons name="add" size={20} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-secondary rounded-full p-3"
                    onPress={toggleCameraFacing}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    disabled={isValidating}
                  >
                    <Ionicons name="camera-reverse" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {isValidating && (
                  <View className="bg-primary rounded-lg px-6 py-3">
                    <Text className="text-primary-foreground font-medium">
                      Validating ticket...
                    </Text>
                  </View>
                )}

                {scanned && !isValidating && (
                  <View className="bg-yellow-500 rounded-lg px-6 py-3">
                    <Text className="text-white font-medium">
                      Processing...
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-center items-center p-6">
            <Ionicons name="qr-code-outline" size={120} color="#6b7280" />
            <Text className="text-foreground text-2xl font-semibold mt-6 mb-4 text-center">
              QR Scanner
            </Text>
            <Text className="text-muted-foreground text-base mb-8 text-center">
              Camera access is not available on web platform. Please use a
              mobile device for QR code scanning.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
