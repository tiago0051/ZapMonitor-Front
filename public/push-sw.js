/* Notificações em segundo plano do ZapMonitor (Web Push). Importado pelo service worker gerado pelo vite-plugin-pwa. */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ZapMonitor", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // Com o ZapMonitor aberto e em foco, o próprio chat já avisa: não repete a notificação
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.focused && client.visibilityState === "visible")) return;

      await self.registration.showNotification(payload.title || "ZapMonitor", {
        body: payload.body || "",
        tag: payload.tag,
        // Uma notificação nova do mesmo contato substitui a anterior e avisa de novo
        renotify: !!payload.tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: payload.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reaproveita uma janela do ZapMonitor já aberta, levando-a para a conversa
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(url);
        return;
      }

      await self.clients.openWindow(url);
    })(),
  );
});
