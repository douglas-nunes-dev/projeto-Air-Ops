import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ordemRepository, storageProvider } from '@/data';
import type { ConclusaoFormulario } from '@/domain/ordem/conclusaoFormulario';
import type { Execucao } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { ordemDeTeste } from '@/test/dados';
import { concluirAtendimento } from './conclusaoService';

vi.mock('@/data', () => ({
  ordemRepository: { concluir: vi.fn() },
  storageProvider: { enviar: vi.fn() },
  execucaoRepository: {},
  localRepository: {},
}));

const quem = { usuarioId: 'tec-1', papeis: ['tecnico' as const] };
const ordem: Ordem = { ...ordemDeTeste, status: 'em_execucao', tecnicoId: 'tec-1' };
const execucao: Execucao = {
  anotacoes: { diagnostico: 'Capacitor', materiais: null },
  checklist: [],
  atividades: [],
  fotos: [{ id: 'f', caminho: 'x', legenda: null, tiradaEm: '', criadoPorNome: null }],
  assinatura: null,
};
const assinado: ConclusaoFormulario = {
  semAssinatura: false,
  assinou: true,
  nomeAssinante: ' Carla ',
  motivoSemAssinatura: '',
};
const imagem = new Blob(['jpeg'], { type: 'image/jpeg' });

beforeEach(() => {
  vi.mocked(ordemRepository.concluir).mockReset().mockResolvedValue();
  vi.mocked(storageProvider.enviar).mockReset().mockResolvedValue();
});

describe('concluirAtendimento', () => {
  it('envia a imagem para a pasta da OS e depois conclui com o caminho', async () => {
    await concluirAtendimento({
      ordem,
      quem,
      execucao,
      fotosNaFila: 0,
      formulario: assinado,
      imagemAssinatura: imagem,
    });

    const [caminho, arquivo] = vi.mocked(storageProvider.enviar).mock.calls[0];
    expect(caminho).toMatch(new RegExp(`^${ordem.organizacaoId}/${ordem.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(arquivo).toBe(imagem);
    expect(ordemRepository.concluir).toHaveBeenCalledWith(ordem.id, {
      nomeAssinante: 'Carla',
      caminhoAssinatura: caminho,
    });
  });

  it('sem assinatura: conclui só com o motivo, sem enviar imagem', async () => {
    await concluirAtendimento({
      ordem,
      quem,
      execucao,
      fotosNaFila: 0,
      formulario: { ...assinado, semAssinatura: true, motivoSemAssinatura: 'Responsável ausente' },
      imagemAssinatura: null,
    });
    expect(storageProvider.enviar).not.toHaveBeenCalled();
    expect(ordemRepository.concluir).toHaveBeenCalledWith(ordem.id, {
      motivoSemAssinatura: 'Responsável ausente',
    });
  });

  it('recusa antes de enviar quando falta algo (inclusive foto ainda na fila)', async () => {
    await expect(
      concluirAtendimento({
        ordem,
        quem,
        execucao,
        fotosNaFila: 1,
        formulario: assinado,
        imagemAssinatura: imagem,
      }),
    ).rejects.toMatchObject({ message: 'Aguarde as fotos terminarem de enviar.' });

    await expect(
      concluirAtendimento({
        ordem: { ...ordem, status: 'pausada' },
        quem,
        execucao,
        fotosNaFila: 0,
        formulario: assinado,
        imagemAssinatura: imagem,
      }),
    ).rejects.toMatchObject({ motivo: 'dados_invalidos' });
    expect(storageProvider.enviar).not.toHaveBeenCalled();
    expect(ordemRepository.concluir).not.toHaveBeenCalled();
  });
});
