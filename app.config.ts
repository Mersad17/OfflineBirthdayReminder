import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "birthdayly-mobile",
  slug: "birthdayly-mobile",
  scheme: "birthdayly",
  icon: "./assets/icon.png",
  android: {
    package: 'com.mersadura.birthdayly',
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#FFFFFF",
    },
  },

  ios: {
    bundleIdentifier: 'com.mersadura.birthdayly',
    icon: "./assets/icon.png",
  },
  extra: {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
        eas: {
      projectId: '96199366-28f3-491d-9e30-f08b3f1cd9b8',
    },
  },
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  
};

export default config;
