'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { escucharEnPrimerPlano } from '@/lib/firebase/client';

/**
 * No renderiza nada — solo conecta los dos caminos por los que puede
 * llegar un click de push a "abrir la pantalla correspondiente":
 *  1. App en primer plano: Firebase no dispara el service worker, así
 *     que se muestra un toast con acción; tocarlo navega.
 *  2. App cerrada/en background: el click lo maneja
 *     firebase-messaging-sw.js, que le hace postMessage a la ventana
 *     ya abierta (si existe) — acá se escucha ese mensaje y se navega.
 */
export function PushListener() {
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    let cancelarSuscripcion: (() => void) | undefined;

    escucharEnPrimerPlano((deepLink, titulo, cuerpo) => {
      if (!activo) return;
      toast(titulo, {
        description: cuerpo,
        action: deepLink ? { label: 'Ver', onClick: () => router.push(deepLink) } : undefined,
      });
    }).then((cancelar) => {
      if (activo) cancelarSuscripcion = cancelar;
      else cancelar();
    });

    function alRecibirMensaje(event: MessageEvent) {
      if (event.data?.tipo === 'push-click' && typeof event.data.deep_link === 'string') {
        router.push(event.data.deep_link);
      }
    }
    navigator.serviceWorker?.addEventListener('message', alRecibirMensaje);

    return () => {
      activo = false;
      cancelarSuscripcion?.();
      navigator.serviceWorker?.removeEventListener('message', alRecibirMensaje);
    };
  }, [router]);

  return null;
}
