// ÚNICO lugar que escolhe a implementação de dados (regra 7 da seção 7).
// Para migrar para a API Node, troque as classes abaixo pelas de ./api/.
import { OpenMeteoClimaProvider } from './clima/OpenMeteoClimaProvider';
import { IndexedDbFilaFotos } from './fila/IndexedDbFilaFotos';
import type { AuthProvider } from './repositories/AuthProvider';
import type { ClimaProvider } from './repositories/ClimaProvider';
import type { ClienteRepository } from './repositories/ClienteRepository';
import type { EquipamentoRepository } from './repositories/EquipamentoRepository';
import type { ExecucaoRepository } from './repositories/ExecucaoRepository';
import type { FilaFotos } from './repositories/FilaFotos';
import type { LocalRepository } from './repositories/LocalRepository';
import type { OrdemRepository } from './repositories/OrdemRepository';
import type { OrganizacaoRepository } from './repositories/OrganizacaoRepository';
import type { StorageProvider } from './repositories/StorageProvider';
import { SupabaseAuthProvider } from './supabase/SupabaseAuthProvider';
import { SupabaseClienteRepository } from './supabase/SupabaseClienteRepository';
import { SupabaseEquipamentoRepository } from './supabase/SupabaseEquipamentoRepository';
import { SupabaseExecucaoRepository } from './supabase/SupabaseExecucaoRepository';
import { SupabaseLocalRepository } from './supabase/SupabaseLocalRepository';
import { SupabaseOrdemRepository } from './supabase/SupabaseOrdemRepository';
import { SupabaseOrganizacaoRepository } from './supabase/SupabaseOrganizacaoRepository';
import { SupabaseStorageProvider } from './supabase/SupabaseStorageProvider';

export const authProvider: AuthProvider = new SupabaseAuthProvider();
export const organizacaoRepository: OrganizacaoRepository = new SupabaseOrganizacaoRepository();
export const clienteRepository: ClienteRepository = new SupabaseClienteRepository();
export const localRepository: LocalRepository = new SupabaseLocalRepository();
export const equipamentoRepository: EquipamentoRepository = new SupabaseEquipamentoRepository();
export const ordemRepository: OrdemRepository = new SupabaseOrdemRepository();
export const climaProvider: ClimaProvider = new OpenMeteoClimaProvider();
export const execucaoRepository: ExecucaoRepository = new SupabaseExecucaoRepository();
export const storageProvider: StorageProvider = new SupabaseStorageProvider();
export const filaFotos: FilaFotos = new IndexedDbFilaFotos();
