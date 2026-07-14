import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Cliente Supabase para Client Components. Uno solo por sesión de browser
 * (createBrowserClient ya cachea la instancia internamente).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
