import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ErroAutenticacao } from '@/domain/auth/erros';

const VariaveisSupabaseSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

let cliente: SupabaseClient | null = null;

// Criado só no primeiro uso: assim o app abre (e os testes rodam) mesmo sem .env.local,
// e o erro aparece com uma mensagem clara na hora de usar.
export function obterClienteSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const variaveis = VariaveisSupabaseSchema.safeParse(import.meta.env);
  if (!variaveis.success) {
    throw new ErroAutenticacao('configuracao_ausente', { cause: variaveis.error });
  }

  cliente = createClient(variaveis.data.VITE_SUPABASE_URL, variaveis.data.VITE_SUPABASE_ANON_KEY);
  return cliente;
}
