import { NextResponse } from 'next/server';

// Se sirve como archivo estático generado (no hardcodeado en /public)
// para no tener que pegar la config de Firebase en dos lugares — sale
// de las mismas NEXT_PUBLIC_FIREBASE_* que usa el cliente. Son claves
// públicas (van al bundle igual), no secretos.
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const body = `
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

// Push con la app cerrada o en otra pestaña. El deep_link viaja en
// "data" (no en "notification") — FCM no navega solo, así que hay que
// guardarlo para cuando el click dispare notificationclick.
messaging.onBackgroundMessage((payload) => {
  const link = (payload.data && payload.data.deep_link) || '/app';
  const titulo = (payload.notification && payload.notification.title) || 'CRC';
  const cuerpo = (payload.notification && payload.notification.body) || '';

  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/icon-512x512.png',
    data: { deep_link: link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.deep_link) || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.postMessage({ tipo: 'push-click', deep_link: link });
          return ventana.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    }),
  );
});
`.trim();

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  });
}
