import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "birthdayly-mobile",
  slug: "birthdayly-mobile",
  scheme: "birthdayly",
  android: {
    package: 'com.mersadura.birthdayly',
  },

  ios: {
    bundleIdentifier: 'com.mersadura.birthdayly',
  },
  extra: {
    API_BASE_URL: "http://192.168.1.169:8000/api",
    eas: {
      projectId: '96199366-28f3-491d-9e30-f08b3f1cd9b8',
    },
  },
};

export default config;
