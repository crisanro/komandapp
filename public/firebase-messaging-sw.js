importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyB0A7yWil5fXQEj8zIyUpP1lxrf0pfzvck",
  projectId:         "komandapp-902ab",
  messagingSenderId: "756844756403",
  appId:             "1:756844756403:web:73e7c38296d7947b765fc6",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "Mesa", {
    body:    body ?? "",
    icon:    "/icon-192.png",
    badge:   "/badge-72.png",
    vibrate: [200, 100, 200],
    data:    payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});