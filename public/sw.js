// Service Worker for Push Notifications
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icon.png", // Ensure you have an icon
      badge: "/badge.png", // Optional badge
      data: data.data, // e.g., url to open
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.");
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
