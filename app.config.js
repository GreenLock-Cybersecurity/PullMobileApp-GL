// app.config.js
export default {
  expo: {
    name: "Pull Events",
    slug: "pull-events-staff",
    version: "1.0.0",
    scheme: "pullevents",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission: "Pull Events needs camera access to scan QR codes for ticket validation."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Pull Events needs access to your photos to upload event images."
        }
      ],
      [
        "expo-notifications",
        {
          color: "#8b5cf6"
        }
      ]
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.pullevents.com/api/v1",
      eas: {
        // Proyecto EAS re-creado bajo la cuenta corporativa diego-gl
        // (2026-07-09). El proyecto original cc92c30d-... quedó en una
        // cuenta de Expo inaccesible; TestFlight no se ve afectado (manda
        // el bundle id en App Store Connect).
        projectId: "b7de73de-11ef-4545-9bfd-f3bde2e66e8c",
      }
    },
    ios: {
      bundleIdentifier: "com.pullevents.staff",
      supportsTablet: true,
      buildNumber: "1",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#0a0a0f"
      },
      infoPlist: {
        NSCameraUsageDescription: "Pull Events needs camera access to scan QR codes for ticket validation.",
        NSPhotoLibraryUsageDescription: "Pull Events needs access to your photos to upload event images.",
        NSPhotoLibraryAddUsageDescription: "Pull Events needs permission to save images to your photo library.",
        CFBundleAllowMixedLocalizations: true
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.pullevents.staff",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0a0a0f"
      },
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#0a0a0f"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
};
