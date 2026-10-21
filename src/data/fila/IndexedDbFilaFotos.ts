import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FilaFotos } from '../repositories/FilaFotos';
import type { FotoPendente } from '@/domain/ordem/execucao';

// Fila de fotos no próprio aparelho (IndexedDB guarda até arquivos grandes e sobrevive a
// fechar o app). As fotos ficam aqui só até serem enviadas, ou até a pessoa sair da conta.
interface BancoDaFila extends DBSchema {
  'fotos-pendentes': { key: string; value: FotoPendente };
}

const NOME_DO_BANCO = 'airops-fila';
const LOJA = 'fotos-pendentes';

let conexao: Promise<IDBPDatabase<BancoDaFila>> | null = null;

function abrir(): Promise<IDBPDatabase<BancoDaFila>> {
  conexao ??= openDB<BancoDaFila>(NOME_DO_BANCO, 1, {
    upgrade(banco) {
      banco.createObjectStore(LOJA, { keyPath: 'id' });
    },
  });
  return conexao;
}

export class IndexedDbFilaFotos implements FilaFotos {
  async guardar(foto: FotoPendente): Promise<void> {
    await (await abrir()).put(LOJA, foto);
  }

  async listar(): Promise<FotoPendente[]> {
    const fotos = await (await abrir()).getAll(LOJA);
    return fotos.sort((a, b) => a.tiradaEm.localeCompare(b.tiradaEm));
  }

  async remover(id: string): Promise<void> {
    await (await abrir()).delete(LOJA, id);
  }

  async marcarErro(id: string, erro: string): Promise<void> {
    const banco = await abrir();
    const foto = await banco.get(LOJA, id);
    if (foto) await banco.put(LOJA, { ...foto, erro });
  }

  async limpar(): Promise<void> {
    await (await abrir()).clear(LOJA);
  }
}
