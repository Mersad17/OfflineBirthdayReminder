// src/navigation/navigationRef.ts
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

let pendingNotificationContact:
  | {
      contactId: string;
      contactName?: string;
    }
  | null = null;

export function openContactFromNotification(params: {
  contactId?: unknown;
  contactName?: unknown;
}) {
  const contactId = cleanString(params.contactId);
  const contactName = cleanString(params.contactName);

  if (!contactId) {
    console.log("Notification tap ignored: missing contactId");
    return;
  }

  if (!navigationRef.isReady()) {
    pendingNotificationContact = {
      contactId,
      contactName,
    };

    return;
  }

  navigateToContactProfile({
    contactId,
    contactName,
  });
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationContact) return;
  if (!navigationRef.isReady()) return;

  const params = pendingNotificationContact;
  pendingNotificationContact = null;

  navigateToContactProfile(params);
}

function navigateToContactProfile(params: {
  contactId: string;
  contactName?: string;
}) {
  navigationRef.navigate("MainTabs", {
    screen: "Contacts",
    params: {
      screen: "ContactDetail",
      params: {
        contactId: params.contactId,
        contactName: params.contactName || "Contact",
      },
    },
  });
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const clean = String(value).trim();

  return clean.length > 0 ? clean : undefined;
}