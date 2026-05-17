# Birthday Reminder – Mobile App

React Native + Expo frontend for the Birthday Reminder Django API.

The app talks to the Django backend only through API calls.

---

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- Django REST API backend

---

## Start Project

Install dependencies:

```bash
npm install
```

Start Expo:

npx expo start

Then open the app with:

Expo Go on your phone
Android emulator
iOS simulator
Web browser, if supported
Environment Setup

The app needs the backend API URL.And needs to be on the same wifi.

Create a .env file in the project root:

EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080/api

Replace 192.168.x.x with your computer's local IP address.

Example:

EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8080/api

The backend should be running with Docker or locally.

Find Your Local IP

On Windows:

ipconfig

Look for:

IPv4 Address

On Mac/Linux:

ifconfig

or:

ip addr

You usually need something like:

192.168.1.x
Important Files
assets/

Images, icons, and static files.

env.ts

Reads the backend API URL.

api.ts

Contains API requests to the Django backend.

types.ts

Contains TypeScript types for API data.

AuthContext

Stores authentication state.

RootNavigator

Decides whether the user sees auth screens or the main app.

AppTabs

Bottom tabs for:

Home
Contacts
Events
Settings
Basic App Flow
Screen → api.ts → Django API → data shown in app

Example:

HomeScreen asks for birthdays
api.ts calls Django API
Django returns data
HomeScreen displays the data
Backend URL Example

For local development with Docker backend:

EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8080/api

Do not use this on a real phone:

EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api

Because on your phone, localhost means the phone itself, not your computer.

EAS Builds Later

Later, when using EAS cloud builds, we can set different API URLs in eas.json.

Example:

{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://192.168.x.x:8080/api"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://staging-api.yourdomain.com/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com/api"
      }
    }
  }
}
Quick Start
npm install
npx expo start

Make sure the Django backend is also running.