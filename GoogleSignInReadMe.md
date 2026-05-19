# Google Auth Setup — Simple Steps

The code is already implemented.
The other developer only needs to set up EAS, Google OAuth IDs, and `.env` values.

---

## 1. Install project dependencies

In the frontend project:

```bash
npm install
```

---

## 2. Build backend

In the backend project:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 3. Check or change the app name/package

Open `app.json`.

Current config:

```json
{
  "expo": {
    "name": "birthdayly-mobile",
    "slug": "birthdayly-mobile",
    "scheme": "birthdayly",
    "ios": {
      "bundleIdentifier": "com.mersad.birthdayly"
    },
    "android": {
      "package": "com.mersad.birthdayly"
    }
  }
}
```

You can change the app name if needed:

```json
"name": "your-app-name",
"slug": "your-app-name"
```

But if you change this:

```json
"package": "com.mersad.birthdayly"
```

then you must use the same package name in Google Cloud later.

For Android Google login, this value is very important:

```txt
com.mersad.birthdayly
```

---

## 4. Install and login to EAS

Install EAS CLI globally:

```bash
npm install -g eas-cli
```

Login:

```bash
eas login
```

Configure EAS if the project is new:

```bash
eas build:configure
```

---

## 5. Create/get new Android EAS credentials

Run:

```bash
eas credentials
```

Choose:

```txt
Android
→ Select this project
→ Keystore
```

If there is no keystore yet, let EAS create a new one.

Then choose:

```txt
Show credentials
```

Copy the **SHA-1 certificate fingerprint**.

You need this SHA-1 for Google Cloud.

---

## 6. Create Google OAuth Web Client

Go to Google Cloud Console:

```txt
APIs & Services
→ Credentials
→ Create Credentials
→ OAuth client ID
```

Create:

```txt
Application type: Web application
Name: Birthdayly Web Client
```

Copy the Web client ID.

It looks like:

```txt
xxxxx.apps.googleusercontent.com
```

This ID is used in both frontend and backend `.env`.

---

## 7. Create Google OAuth Android Client

In Google Cloud Console, create another OAuth client:

```txt
Application type: Android
Name: Birthdayly Android Dev
```

Use:

```txt
Package name: com.mersad.birthdayly
SHA-1: paste the SHA-1 from EAS credentials
```

If you changed the Android package in `app.json`, use your new package name instead.

Copy the Android client ID.

---

## 8. Add frontend `.env`

In the Expo frontend `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:8000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

Use your computer local IP, not `localhost`.

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8000/api
```

---

## 9. Add backend `.env`

In the Django backend `.env`:

```env
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Use the **Web client ID**, not the Android client ID.

---

## 10. Build and run the development app

Google login does not work in Expo Go.
Use a development build.

Build Android:

```bash
eas build --profile development --platform android
```

Install the generated app on your phone.

Start Expo:

```bash
npx expo start --dev-client --clear
```

Open the app with the installed development build.

---

## Test

Press:

```txt
Continue with Google
```

Expected backend logs:

```txt
POST /api/accounts/auth/google/ 200
GET /api/accounts/me/ 200
```

If both are `200`, Google login works.


# Production difference

For production, the code is the same.

Only change these:

```txt
1. Frontend API URL
Dev: http://192.168.1.X:8000/api
Prod: https://your-production-domain.com/api

2. Backend env
Add the same GOOGLE_WEB_CLIENT_ID on the production server.

3. Android SHA-1
Dev: use EAS development keystore SHA-1
Prod: use Google Play App Signing SHA-1
```

Important:

```txt
If Google login works in dev but fails in production,
check the production SHA-1 in Google Cloud.
```
For your case, probably no full Google verification needed.

Because you only use basic login scopes:

openid
email
profile

These are normally non-sensitive scopes. Google says apps using only non-sensitive scopes do not need full OAuth app verification.

But you should still do this in Google Console:

OAuth consent screen
→ Add app name
→ Add support email
→ Add developer email
→ Add privacy policy URL for production
→ Set publishing status to Production

You may need brand verification only if you want the app to show your official logo/name nicely on the Google consent screen. Full verification is mainly needed when you request sensitive/restricted scopes like Gmail, Drive, Calendar, etc.