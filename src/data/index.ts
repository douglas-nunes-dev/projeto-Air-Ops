// ÚNICO lugar que escolhe a implementação de dados (regra 7 da seção 7).
// Para migrar para a API Node, troque as classes abaixo pelas de ./api/.
import type { AuthProvider } from './repositories/AuthProvider';
import type { ClienteRepository } from './repositories/ClienteRepository';
import type { EquipamentoRepository } from './repositories/EquipamentoRepository';
import type { LocalRepository } from './repositories/LocalRepository';
import type { OrganizacaoRepository } from './repositories/OrganizacaoRepository';
import { SupabaseAuthProvider } from './supabase/SupabaseAuthProvider';
import { SupabaseClienteRepository } from './supabase/SupabaseClienteRepository';
import { SupabaseEquipamentoRepository } from './supabase/SupabaseEquipamentoRepository';
import { SupabaseLocalRepository } from './supabase/SupabaseLocalRepository';
import { SupabaseOrganizacaoRepository } from './supabase/SupabaseOrganizacaoRepository';

export const authProvider: AuthProvider = new SupabaseAuthProvider();
export const organizacaoRepository: OrganizacaoRepository = new SupabaseOrganizacaoRepository();
export const clienteRepository: ClienteRepository = new SupabaseClienteRepository();
export const localRepository: LocalRepository = new SupabaseLocalRepository();
export const equipamentoRepository: EquipamentoRepository = new SupabaseEquipamentoRepository();
