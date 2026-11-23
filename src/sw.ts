/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Never cache or hijack API or SSE requests
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly());

// Offline navigation fallback (never hijack /api/* or /__/* routes)
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//, /^\/__\//],
    })
  );
} catch {
  // Dev mode without precached /index.html
}

// Cache Google Fonts stylesheets & font files
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

interface ChoyPushPayload {
  kind?: 'message' | 'call' | 'call_ended';
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  roomId?: string;
  callId?: string;
  callerName?: string;
  url?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: ChoyPushPayload = {};
  try {
    payload = event.data.json() as ChoyPushPayload;
  } catch {
    payload = { kind: 'message', title: 'Choy Chat', body: event.data.text() };
  }

  const kind = payload.kind || 'message';

  event.waitUntil(
    (async () => {
      // Clear ringing notification if caller hung up or declined
      if (kind === 'call_ended' && payload.callId) {
        const existing = await self.registration.getNotifications({
          tag: `choy-call-${payload.callId}`,
        });
        existing.forEach((n) => n.close());
        return;
      }

      // Check if an app window is already actively focused on screen
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const hasFocusedClient = windowClients.some((c) => 'focused' in c && c.focused);

      // If user is already actively looking at the app, skip duplicate OS notification for calls/messages
      // (in-app live toast / incoming call banner handles it immediately)
      if (hasFocusedClient && kind === 'message') {
        return;
      }

      const defaultProfileIcon = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
      const iconUrl = payload.icon || defaultProfileIcon;
      const badgeUrl = payload.badge || '/pwa-192x192.png';

      if (kind === 'call') {
        const callTag = payload.tag || `choy-call-${payload.callId || Date.now()}`;
        const options: NotificationOptions & {
          vibrate?: number[];
          renotify?: boolean;
          actions?: Array<{ action: string; title: string }>;
          image?: string;
        } = {
          body: payload.body || 'Incoming live video call — Tap to answer',
          icon: iconUrl,
          badge: badgeUrl,
          image: iconUrl,
          tag: callTag,
          renotify: true,
          requireInteraction: true,
          silent: false,
          vibrate: [500, 250, 500, 250, 500, 250, 500],
          data: {
            kind: 'call',
            callId: payload.callId || '',
            roomId: payload.roomId || payload.callerName || 'VIP Group',
            callerName: payload.callerName || 'Member',
            url:
              payload.url ||
              `/?incomingCall=${encodeURIComponent(payload.callId || '')}&caller=${encodeURIComponent(
                payload.callerName || 'Member'
              )}&room=${encodeURIComponent(payload.roomId || 'VIP Group')}`,
          },
          actions: [
            { action: 'answer', title: 'Answer Call' },
            { action: 'decline', title: 'Decline' },
          ],
        };

        await self.registration.showNotification(
          payload.title || `Incoming Video Call · ${payload.callerName || 'Choy Chat'}`,
          options
        );
        return;
      }

      // Standard background message notification (shows sender profile icon on home/lock screen)
      const msgTag = payload.tag || `choy-msg-${payload.roomId || 'chat'}`;
      const options: NotificationOptions & {
        vibrate?: number[];
        renotify?: boolean;
        actions?: Array<{ action: string; title: string }>;
      } = {
        body: payload.body || 'You have a new message on Choy Chat',
        icon: iconUrl,
        badge: badgeUrl,
        tag: msgTag,
        renotify: true,
        silent: false,
        vibrate: [180, 100, 180],
        data: {
          kind: 'message',
          roomId: payload.roomId || 'VIP Group',
          url: payload.url || `/?openChat=${encodeURIComponent(payload.roomId || 'VIP Group')}`,
        },
        actions: [{ action: 'open', title: 'Open Chat' }],
      };

      await self.registration.showNotification(payload.title || 'Choy Chat', options);
    })()
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data || {}) as {
    kind?: string;
    callId?: string;
    roomId?: string;
    callerName?: string;
    url?: string;
  };
  const clickedAction = event.action || 'open';

  event.waitUntil(
    (async () => {
      // Allow declining an incoming call directly from the home-screen notification
      if (data.kind === 'call' && clickedAction === 'decline' && data.callId) {
        try {
          await fetch('/api/choy/rtc/signal', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'decline',
              callId: data.callId,
              roomId: data.roomId || 'VIP Group',
              targetName: data.callerName || 'Member',
            }),
          });
        } catch {
          // Ignore network errors on background decline
        }
        return;
      }

      const targetPath =
        data.kind === 'call'
          ? `/?incomingCall=${encodeURIComponent(data.callId || '')}&caller=${encodeURIComponent(
              data.callerName || 'Member'
            )}&room=${encodeURIComponent(data.roomId || 'VIP Group')}&action=${encodeURIComponent(
              clickedAction === 'answer' ? 'answer' : 'open'
            )}`
          : data.url || `/?openChat=${encodeURIComponent(data.roomId || 'VIP Group')}`;

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'CHOY_NOTIFICATION_ACTION',
            kind: data.kind || 'message',
            action: clickedAction,
            callId: data.callId || '',
            roomId: data.roomId || 'VIP Group',
            callerName: data.callerName || '',
          });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetPath);
      }
    })()
  );
});
