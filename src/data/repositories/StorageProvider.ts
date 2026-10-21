// Arquivos (fotos) — seção 11, "Arquivos". Hoje é o Supabase Storage; no futuro, outro (ex.: S3).
// O banco guarda só o caminho; o endereço para ver o arquivo é temporário (regra 9).
// Toda falha deve ser lançada como ErroDados.
export interface StorageProvider {
  /** Envia o arquivo. Se já existir no mesmo caminho (envio repetido), não é erro. */
  enviar(caminho: string, arquivo: Blob): Promise<void>;
  /** Endereços temporários para ver os arquivos, na mesma ordem dos caminhos. */
  enderecosTemporarios(caminhos: string[], validadeSegundos: number): Promise<string[]>;
  remover(caminho: string): Promise<void>;
}
