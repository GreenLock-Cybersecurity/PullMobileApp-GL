// app.config.js
export default {
  expo: {
    name: "Pull Events Staff",
    slug: "pull-events-staff",
    version: "1.0.0",
    scheme: "pullevents",
    plugins: [
      "expo-router"
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.100:8080/api/v1"
    },
    ios: {
      bundleIdentifier: "com.pullevents.staff",
      supportsTablet: true
    },
    android: {
      package: "com.pullevents.staff",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    }
  }
};