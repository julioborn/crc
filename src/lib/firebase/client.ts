'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';

/**
 * Firebase entra ACÁ únicamente para push (Cloud Messaging). La
 * identidad la maneja Supabase Auth de punta a punta — este módulo no
 * toca sesión ni usuario, solo tokens de dispositivo.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function firebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let mensajeriaPromise: Promise<Messaging | null> | null = null;

function obtenerMensajeria(): Promise<Messaging | null> {
  if (!mensajeriaPromise) {
    mensajeriaPromise = isSupported()
      .then((soportado) => (soportado ? getMessaging(firebaseApp()) : null))
      .catch(() => null);
  }
  return mensajeriaPromise;
}

export type ResultadoPermiso = 'concedido' | 'denegado' | 'no_soportado' | 'error';

/**
 * En iOS, Safari/Chrome/lo que sea corren sobre el mismo motor de Apple
 * (WebKit) y ese motor solo entrega push a una pestaña normal — no
 * soporta Notification API en absoluto salvo que la página esté
 * agregada a la pantalla de inicio (iOS 16.4+, modo standalone). Sin
 * este chequeo, pedirPermisoYRegistrar devuelve 'no_soportado' sin
 * explicar por qué.
 */
export function esIOSNoInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const esStandalone =
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return esIOS && !esStandalone;
}

/**
 * Pide permiso de notificaciones (si todavía no se decidió) y, si se
 * concede, registra el service worker y guarda el token FCM vía
 * `registrar`. Diseñado para llamarse en un momento con intención real
 * (después de reservar un turno, o desde la pantalla de preferencias)
 * — nunca automáticamente al abrir la app.
 */
export async function pedirPermisoYRegistrar(
  registrar: (token: string, plataforma: 'web') => Promise<{ error: string | null }>,
): Promise<ResultadoPermiso> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'no_soportado';
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    console.error('pedirPermisoYRegistrar: falta NEXT_PUBLIC_FIREBASE_VAPID_KEY');
    return 'error';
  }

  const permisoActual =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permisoActual !== 'granted') return 'denegado';

  const mensajeria = await obtenerMensajeria();
  if (!mensajeria) return 'no_soportado';

  try {
    const registro = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(mensajeria, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registro,
    });
    if (!token) return 'error';

    const resultado = await registrar(token, 'web');
    return resultado.error ? 'error' : 'concedido';
  } catch (err) {
    console.error('pedirPermisoYRegistrar', err);
    return 'error';
  }
}

/**
 * Con la pestaña en primer plano, Firebase NO dispara el service
 * worker — hay que escuchar acá y decidir qué mostrar. Devuelve la
 * función para cancelar la suscripción.
 */
export async function escucharEnPrimerPlano(
  onMensaje: (deepLink: string | null, titulo: string, cuerpo: string) => void,
): Promise<() => void> {
  const mensajeria = await obtenerMensajeria();
  if (!mensajeria) return () => {};

  return onMessage(mensajeria, (payload) => {
    const deepLink = (payload.data?.deep_link as string | undefined) ?? null;
    onMensaje(deepLink, payload.notification?.title ?? 'CRC', payload.notification?.body ?? '');
  });
}
