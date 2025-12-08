// app.config.js
export default {
  expo: {
    name: "Pull Events Staff",
    slug: "pull-events-staff",
    version: "1.0.0",
    scheme: "pullevents",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
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
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      }
    },
    ios: {
      bundleIdentifier: "com.pullevents.staff",
      supportsTablet: true,
      buildNumber: "1",
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
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
};