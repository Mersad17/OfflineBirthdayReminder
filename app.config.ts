import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "birthdayly-mobile",
  slug: "birthdayly-mobile",
  scheme: "birthdayly",
  icon: "./assets/icon.png",

  plugins: [
    "expo-sqlite",
    "@react-native-community/datetimepicker",
    "expo-localization",
    "expo-sharing",
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        imageWidth: 200
      }
    ]
  ],

  android: {
    package: "com.mersadura.birthdayly",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#FFFFFF"
    }
  },

  ios: {
    bundleIdentifier: "com.mersadura.birthdayly",
    icon: "./assets/icon.png"
  },

  extra: {
    eas: {
      projectId: "96199366-28f3-491d-9e30-f08b3f1cd9b8"
    }
  }
};

export default config;