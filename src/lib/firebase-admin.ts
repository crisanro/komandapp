//src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(serviceAccount) });
}

const fcmAdmin = getMessaging();

export async function sendPushNotification({
  token, title, body, data,
}: {
  token: string; title: string; body: string; data?: Record<string, string>;
}) {
  try {
    await fcmAdmin.send({
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: { icon: "/icon-192.png", badge: "/badge-72.png", vibrate: [200, 100, 200] },
        fcmOptions: { link: "/" },
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "messaging/registration-token-not-registered") {
      console.log("[FCM] Token inválido:", token.slice(0, 20));
    } else {
      console.error("[FCM] Error:", err);
    }
  }
}

export async function sendPushToMany({
  tokens, title, body, data,
}: {
  tokens: string[]; title: string; body: string; data?: Record<string, string>;
}) {
  if (tokens.length === 0) return;
  await Promise.allSettled(tokens.map(token => sendPushNotification({ token, title, body, data })));
}