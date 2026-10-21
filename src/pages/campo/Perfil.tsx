import { CloudUpload, LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ConfirmarAcao } from '@/components/pagina/ConfirmarAcao';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROTULOS_PAPEL } from '@/domain/organizacao/tipos';
import { useFotosPendentes } from '@/hooks/useFotosPendentes';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { useSessao } from '@/hooks/useSessao';
import { mensagemDeErro } from '@/lib/erros';
import { sair } from '@/services/authService';
import { enviarFotosPendentes } from '@/services/storageService';

export function Perfil() {
  const { usuario } = useSessao();
  const organizacao = useOrganizacao();
  const pendentes = useFotosPendentes();
  const [enviando, setEnviando] = useState(false);
  const aguardando = pendentes.filter((foto) => !foto.erro).length;

  async function enviarAgora() {
    setEnviando(true);
    try {
      const { enviadas } = await enviarFotosPendentes();
      toast.success(enviadas > 0 ? `${enviadas} foto(s) enviada(s).` : 'Sem sinal para enviar.');
    } finally {
      setEnviando(false);
    }
  }

  async function aoSair() {
    try {
      await sair();
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    }
  }

  const botaoSair = (
    <Button variant="outline" className="h-12 w-full">
      <LogOut />
      Sair
    </Button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Perfil</h1>
      <Card>
        <CardContent className="space-y-1">
          <p className="font-medium">{organizacao.nomeUsuario}</p>
          <p className="text-sm text-muted-foreground">{usuario?.email}</p>
          <p className="text-sm text-muted-foreground">
            {organizacao.nome} ·{' '}
            {organizacao.papeis.map((papel) => ROTULOS_PAPEL[papel]).join(', ')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {pendentes.length === 0
              ? 'Todas as fotos foram enviadas.'
              : `${pendentes.length} foto(s) guardada(s) neste aparelho esperando envio.`}
          </p>
          {aguardando > 0 && (
            <Button className="h-12 w-full" disabled={enviando} onClick={enviarAgora}>
              <CloudUpload />
              {enviando ? 'Enviando…' : 'Enviar agora'}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button asChild variant="outline" className="h-12 w-full">
          <Link to="/ordens">
            <Monitor />
            Abrir a versão completa (escritório)
          </Link>
        </Button>
        {pendentes.length > 0 ? (
          <ConfirmarAcao
            gatilho={botaoSair}
            titulo="Sair e apagar as fotos não enviadas?"
            descricao={`${pendentes.length} foto(s) ainda não foram enviadas. Ao sair, elas são apagadas deste aparelho para proteger os dados dos clientes.`}
            rotuloConfirmar="Sair mesmo assim"
            aoConfirmar={aoSair}
          />
        ) : (
          <Button variant="outline" className="h-12 w-full" onClick={aoSair}>
            <LogOut />
            Sair
          </Button>
        )}
      </div>
    </div>
  );
}
