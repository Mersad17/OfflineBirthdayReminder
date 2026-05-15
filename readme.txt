EAS builds (later): per-profile env vars

When we start using EAS cloud builds, we can set different API URLs per build profile using eas.json:

development → local network / dev API

preview → staging API

production → production API

Example:

{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://192.168.x.x:8080/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com/api"
      }
    }
  }
}


React Native + Expo frontend for a Django API.

Start project:
npm install
npx expo start

The app uses Django only through API calls.

Important parts:
- assets: icons/images
- env.ts: backend API URL
- api.ts: API requests
- types.ts: TypeScript data types
- AuthContext: authentication state
- RootNavigator: chooses auth screens or main app
- AppTabs: bottom tabs for Home, Contacts, Events, Settings

Basic flow:
Screen → api.ts → Django API → data shown in app
