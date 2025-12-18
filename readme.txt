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


This is configuration management (not hiding): the URL still ends up inside the app.

✅ What should/shouldn’t be in the mobile app

✅ OK in the app: API base URL, feature flags, non-secret config

❌ Never put in the app: DJANGO_SECRET_KEY, JWT_SECRET_KEY, database passwords, Expo push server keys, etc.
Those must stay on the backend only.