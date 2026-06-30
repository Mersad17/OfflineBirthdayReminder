// src/notifications/notificationNavigation.ts
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";

import { openContactFromNotification } from "./navigationRef";

type NotificationData = {
  type?: unknown;
  kind?: unknown;
  reminderId?: unknown;
  eventId?: unknown;
  contactId?: unknown;
  contactName?: unknown;
};

export function useNotificationTapNavigation() {
  const lastHandledIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    function handleResponse(response: Notifications.NotificationResponse) {
      if (!active) return;

      const requestId = response.notification.request.identifier;

      if (lastHandledIdRef.current === requestId) {
        return;
      }

      lastHandledIdRef.current = requestId;
      handleNotificationResponse(response);
    }

    async function handleLastNotificationResponse() {
      try {
        const response =
          await Notifications.getLastNotificationResponseAsync();

        if (!active || !response) return;

        handleResponse(response);
      } catch (error) {
        console.log("Read last notification response failed:", error);
      }
    }

    void handleLastNotificationResponse();

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse
) {
  const data = response.notification.request.content.data as NotificationData;

  if (data?.type !== "relationship_reminder") {
    return;
  }

  const contactId = normalizeString(data.contactId);

  if (!contactId) {
    console.log("Notification tap ignored: missing contactId", data);
    return;
  }

  openContactFromNotification({
    contactId,
    contactName: normalizeString(data.contactName) || "Contact",
  });
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}