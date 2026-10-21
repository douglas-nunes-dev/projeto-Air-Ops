import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execucaoRepository, storageProvider } from '@/data';
import { ErroDados } from '@/domain/erros';
import type { FotoPendente } from '@/domain/ordem/execucao';
import {
  adicionarFoto,
  descartarFotoPendente,
  enviarFotosPendentes,
  listarFotosPendentes,
} from './storageService';

// Fila em memória no lugar do IndexedDB.
const fila = vi.hoisted(() => new Map<string, FotoPendente>());

vi.mock('@/data', () => ({
  filaFotos: {
    guardar: async (foto: FotoPendente) => void fila.set(foto.id, foto),
    listar: async () => [...fila.values()].sort((a, b) => a.tiradaEm.localeCompare(b.tiradaEm)),
    remover: async (id: string) => void fila.delete(id),
    marcarErro: async (id: string, erro: string) => {
      const foto = fila.get(id);
      if (foto) fila.set(id, { ...foto, erro });
    },
    limpar: async () => fila.clear(),
  },
  storageProvider: { enviar: vi.fn(), enderecosTemporarios: vi.fn(), remover: vi.fn() },
  execucaoRepository: { registrarFoto: vi.fn(), removerFoto: vi.fn() },
}));

// No jsdom não há canvas: a redução vira "devolve o próprio arquivo".
vi.mock('@/lib/imagem', () => ({ reduzirFoto: async (arquivo: Blob) => arquivo }));

const ordem = { id: 'ordem-1', organizacaoId: 'org-1' };

function pendente(id: string, tiradaEm: string): FotoPendente {
  return {
    id,
    organizacaoId: 'org-1',
    ordemId: 'ordem-1',
    arquivo: new Blob(['jpeg'], { type: 'image/jpeg' }),
    legenda: null,
    tiradaEm,
    erro: null,
  };
}

beforeEach(() => {
  fila.clear();
  vi.mocked(storageProvider.enviar).mockReset().mockResolvedValue();
  vi.mocked(execucaoRepository.registrarFoto).mockReset().mockResolvedValue();
});

describe('fila de fotos', () => {
  it('guarda a foto e envia: arquivo no caminho "empresa/OS/id.jpg", depois o registro', async () => {
    await adicionarFoto(ordem, new Blob(['foto'], { type: 'image/jpeg' }), '  Placa queimada ');
    await enviarFotosPendentes();

    const [caminho] = vi.mocked(storageProvider.enviar).mock.calls[0];
    expect(caminho).toMatch(/^org-1\/ordem-1\/[0-9a-f-]{36}\.jpg$/);
    expect(execucaoRepository.registrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({ ordemId: 'ordem-1', legenda: 'Placa queimada', tamanhoBytes: 4 }),
    );
    expect(await listarFotosPendentes()).toEqual([]);
  });

  it('sem sinal: para no primeiro erro e mantém tudo na fila, na mesma ordem', async () => {
    fila.set('a', pendente('a', '2026-10-22T10:00:00Z'));
    fila.set('b', pendente('b', '2026-10-22T10:01:00Z'));
    vi.mocked(storageProvider.enviar).mockRejectedValue(new ErroDados('sem_conexao'));

    expect(await enviarFotosPendentes()).toEqual({ enviadas: 0, recusadas: 0 });
    expect(storageProvider.enviar).toHaveBeenCalledTimes(1);
    expect((await listarFotosPendentes()).map((foto) => foto.id)).toEqual(['a', 'b']);
  });

  it('recusa definitiva: marca o erro, segue para as próximas e não insiste depois', async () => {
    fila.set('a', pendente('a', '2026-10-22T10:00:00Z'));
    fila.set('b', pendente('b', '2026-10-22T10:01:00Z'));
    vi.mocked(execucaoRepository.registrarFoto).mockRejectedValueOnce(
      new ErroDados('sem_permissao', { mensagem: 'A OS foi cancelada.' }),
    );

    expect(await enviarFotosPendentes()).toEqual({ enviadas: 1, recusadas: 1 });
    expect(await listarFotosPendentes()).toEqual([
      expect.objectContaining({ id: 'a', erro: 'A OS foi cancelada.' }),
    ]);

    vi.mocked(storageProvider.enviar).mockClear();
    await enviarFotosPendentes();
    expect(storageProvider.enviar).not.toHaveBeenCalled();

    await descartarFotoPendente('a');
    expect(await listarFotosPendentes()).toEqual([]);
  });

  it('dois pedidos de envio ao mesmo tempo não enviam a mesma foto duas vezes', async () => {
    fila.set('a', pendente('a', '2026-10-22T10:00:00Z'));
    await Promise.all([enviarFotosPendentes(), enviarFotosPendentes()]);
    expect(storageProvider.enviar).toHaveBeenCalledTimes(1);
  });

  it('lista só as pendentes da OS pedida', async () => {
    fila.set('a', pendente('a', '2026-10-22T10:00:00Z'));
    fila.set('b', { ...pendente('b', '2026-10-22T10:01:00Z'), ordemId: 'outra' });
    expect((await listarFotosPendentes('ordem-1')).map((foto) => foto.id)).toEqual(['a']);
  });
});
