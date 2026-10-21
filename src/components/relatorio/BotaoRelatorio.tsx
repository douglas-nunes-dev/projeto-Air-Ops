import { FileDown, Share2 } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { nomeArquivoRelatorio } from '@/domain/ordem/relatorio';
import type { Ordem } from '@/domain/ordem/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { compartilharOuBaixar } from '@/lib/arquivo';
import { mensagemDeErro } from '@/lib/erros';
import { prepararRelatorio } from '@/services/conclusaoService';

type Props = {
  ordem: Ordem;
  /** "compartilhar" no celular (WhatsApp, e-mail…); "baixar" no escritório. */
  modo: 'compartilhar' | 'baixar';
} & Pick<ComponentProps<typeof Button>, 'className' | 'variant'>;

export function BotaoRelatorio({ ordem, modo, className, variant }: Props) {
  const organizacao = useOrganizacao();
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    setGerando(true);
    try {
      const dados = await prepararRelatorio(ordem, organizacao.nome);
      // A biblioteca de PDF só é baixada aqui, na primeira vez que alguém pede um relatório.
      const { gerarRelatorioPdf } = await import('./gerarRelatorioPdf');
      const arquivo = await gerarRelatorioPdf(dados);
      const entrega = await compartilharOuBaixar(arquivo, nomeArquivoRelatorio(ordem));
      if (entrega === 'baixado') toast.success('Relatório baixado.');
    } catch (erro) {
      toast.error(`Não foi possível gerar o relatório. ${mensagemDeErro(erro)}`);
    } finally {
      setGerando(false);
    }
  }

  const Icone = modo === 'compartilhar' ? Share2 : FileDown;
  return (
    <Button className={className} variant={variant} disabled={gerando} onClick={gerar}>
      <Icone />
      {gerando
        ? 'Gerando relatório…'
        : modo === 'compartilhar'
          ? 'Compartilhar relatório'
          : 'Baixar relatório (PDF)'}
    </Button>
  );
}
