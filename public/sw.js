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

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          // If so, focus it.
          if (client.url === event.notification.data.url && "focus" in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      }),
  );
});
