// ÚNICO lugar que escolhe a implementação de dados (regra 7 da seção 7).
// Para migrar para a API Node, troque as classes abaixo pelas de ./api/.
import type { AuthProvider } from './repositories/AuthProvider';
import { SupabaseAuthProvider } from './supabase/SupabaseAuthProvider';

export const authProvider: AuthProvider = new SupabaseAuthProvider();
