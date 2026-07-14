const MP_API = 'https://api.mercadopago.com';

export type PreferenciaMP = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

/**
 * Crea una preferencia de Checkout Pro. external_reference lleva
 * "cuotaId:usuarioId" — el webhook necesita ambos: la cuota para marcarla
 * pagada, y el usuario porque movimiento.usuario_id no admite NULL y acá
 * no hay ningún admin "registrando" el pago (lo inició el socio solo).
 */
export async function crearPreferenciaMP(params: {
  cuotaId: string;
  usuarioId: string;
  titulo: string;
  monto: number;
  origin: string;
}): Promise<PreferenciaMP> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Falta configurar MERCADOPAGO_ACCESS_TOKEN en el servidor.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL.');
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: params.titulo,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: params.monto,
        },
      ],
      external_reference: `${params.cuotaId}:${params.usuarioId}`,
      back_urls: {
        success: `${params.origin}/app/mis-cuotas?pago=exito`,
        pending: `${params.origin}/app/mis-cuotas?pago=pendiente`,
        failure: `${params.origin}/app/mis-cuotas?pago=error`,
      },
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Pago rechazó la preferencia (${res.status}): ${body}`);
  }

  return res.json();
}
