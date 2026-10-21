import type { StorageProvider } from '../repositories/StorageProvider';
import { obterClienteSupabase } from './client';
import { converterErroStorage, eArquivoRepetido } from './erros';

// Bucket privado criado na migration da etapa 4.
const BUCKET = 'anexos';

export class SupabaseStorageProvider implements StorageProvider {
  async enviar(caminho: string, arquivo: Blob): Promise<void> {
    const { error } = await obterClienteSupabase()
      .storage.from(BUCKET)
      .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: false });
    if (error && !eArquivoRepetido(error)) throw converterErroStorage(error);
  }

  async enderecosTemporarios(caminhos: string[], validadeSegundos: number): Promise<string[]> {
    if (caminhos.length === 0) return [];
    const { data, error } = await obterClienteSupabase()
      .storage.from(BUCKET)
      .createSignedUrls(caminhos, validadeSegundos);
    if (error) throw converterErroStorage(error);
    const porCaminho = new Map(data.map((item) => [item.path, item.signedUrl]));
    return caminhos.map((caminho) => porCaminho.get(caminho) ?? '');
  }

  async remover(caminho: string): Promise<void> {
    const { error } = await obterClienteSupabase().storage.from(BUCKET).remove([caminho]);
    if (error) throw converterErroStorage(error);
  }
}
