import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL     as string | undefined) ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

export type PerfilUsuario = {
  id: string;
  nome_completo: string;
  nome_usuario: string;
  escola_nome?: string;
  atualizado_em?: string;
};

export async function getPerfilAtual(): Promise<PerfilUsuario | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('perfis_usuarios')
    .select('*')
    .eq('id', user.id)
    .single();
  return data ?? null;
}
