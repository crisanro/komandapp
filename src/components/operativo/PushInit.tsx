"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushInit({ userId }: { userId: string }) {
  usePushNotifications(userId);
  return null;
}