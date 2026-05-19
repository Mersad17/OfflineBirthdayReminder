import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from "../config/env";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  offlineAccess: false,
  scopes: ["profile", "email"],
});

export async function getGoogleIdToken(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const result = await GoogleSignin.signIn();

    if (result.type === "cancelled") {
      throw new Error("Google login was cancelled.");
    }

    const idToken = result.data?.idToken;

    if (!idToken) {
      throw new Error(
        "Google login failed. No ID token returned. Check GOOGLE_WEB_CLIENT_ID and Android SHA-1."
      );
    }

    return idToken;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("Google login was cancelled.");
    }

    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Google login is already in progress.");
    }

    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services is not available or outdated.");
    }

    throw error;
  }
}