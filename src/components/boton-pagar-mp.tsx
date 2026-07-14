'use client';

import { useActionState } from 'react';
import { iniciarPagoMercadoPago, type PagoMPState } from '@/lib/pagos/actions';
import { SubmitButton } from '@/components/submit-button';

const initialState: PagoMPState = { error: null };

export function BotonPagarMP({ cuotaId }: { cuotaId: string }) {
  const [state, formAction] = useActionState(iniciarPagoMercadoPago, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <SubmitButton pendingText="Redirigiendo..." size="sm" className="w-auto">
        Pagar con Mercado Pago
      </SubmitButton>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
