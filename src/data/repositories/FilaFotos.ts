import type { FotoPendente } from '@/domain/ordem/execucao';

// Fotos guardadas no aparelho até haver sinal para enviar (seção 11, "fila de fotos").
export interface FilaFotos {
  guardar(foto: FotoPendente): Promise<void>;
  /** Em ordem de quando foram tiradas. */
  listar(): Promise<FotoPendente[]>;
  remover(id: string): Promise<void>;
  marcarErro(id: string, erro: string): Promise<void>;
  /** Apaga tudo (ao sair da conta, para não deixar fotos de clientes no aparelho). */
  limpar(): Promise<void>;
}
