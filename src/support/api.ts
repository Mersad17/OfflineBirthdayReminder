import { Linking, Platform } from "react-native";

const SUPPORT_EMAIL = "your-email@example.com";
// Later you can use: support@yourapp.com

function buildMailtoUrl(args: {
  subject: string;
  body: string;
}) {
  const subject = encodeURIComponent(args.subject);
  const body = encodeURIComponent(args.body);

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

async function openSupportEmail(args: {
  subject: string;
  body: string;
}) {
  const url = buildMailtoUrl(args);

  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error("No email app found on this device.");
  }

  await Linking.openURL(url);

  return {
    success: true,
  };
}

export async function reportBug(payload: {
  title: string;
  description: string;
  app_version?: string;
  platform?: string;
}) {
  const body = `
Bug report

Title:
${payload.title}

Description:
${payload.description}

Technical info:
App version: ${payload.app_version ?? "unknown"}
Platform: ${payload.platform ?? Platform.OS}
`;

  return openSupportEmail({
    subject: `Bug report: ${payload.title}`,
    body,
  });
}

export async function sendFeedback(payload: {
  message: string;
  app_version?: string;
  platform?: string;
}) {
  const body = `
Feedback

Message:
${payload.message}

Technical info:
App version: ${payload.app_version ?? "unknown"}
Platform: ${payload.platform ?? Platform.OS}
`;

  return openSupportEmail({
    subject: "App feedback",
    body,
  });
}