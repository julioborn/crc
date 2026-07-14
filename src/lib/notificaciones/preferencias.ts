'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/types';

type Categoria = Enums<'notificacion_categoria'>;

// cuota_vencida es institucional: push-send la manda igual aunque acá
// se guarde apagada. No se expone el toggle en la UI para esta
// categoría, pero si alguien la manda de todos modos por fuera del
// formulario, no cambia nada del lado del envío.
export async function actualizarPreferencia(categoria: Categoria, habilitada: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('preferencia_notificacion')
    .upsert(
      { usuario_id: user.id, categoria, habilitada },
      { onConflict: 'usuario_id,categoria' },
    );

  revalidatePath('/app/notificaciones/preferencias');
}
