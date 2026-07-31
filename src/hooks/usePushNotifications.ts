"use client";

import { useEffect } from "react";
import { getFCMToken, getFirebaseMessaging, onMessage } from "@/lib/firebase";
import { guardarPushToken } from "@/actions/push";

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    async function init() {
      // Pedir permiso si no lo tenemos
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      // Registrar service worker
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } catch (err) {
          console.error("[Push] Error registrando SW:", err);
          return;
        }
      }

      // Obtener token FCM
      const token = await getFCMToken();
      if (!token) return;

      // Guardar token en DB
      await guardarPushToken(token);

      // Escuchar notificaciones en foreground (app abierta)
      const messaging = getFirebaseMessaging();
      if (messaging) {
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification ?? {};
          // Mostrar notificación nativa aunque la app esté abierta
          if (title && Notification.permission === "granted") {
            new Notification(title, {
              body:  body ?? "",
              icon:  "/icon-192.png",
              badge: "/badge-72.png",
            });
          }
        });
      }
    }

    init();
  }, [userId]);
}