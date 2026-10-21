import { useQuery } from '@tanstack/react-query';
import { AirVent, ClipboardList, Search, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { StatusOrdem } from '@/domain/ordem/tipos';
import { formatarNumeroOrdem } from '@/domain/ordem/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { normalizarParaBusca } from '@/lib/texto';
import { listarClientes } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { listarOrdens } from '@/services/ordemService';

const MAXIMO_POR_GRUPO = 5;

type Resultado = {
  id: string;
  titulo: string;
  detalhe: string;
  para: string;
  status?: StatusOrdem;
};

function contem(textos: (string | null)[], busca: string): boolean {
  return normalizarParaBusca(textos.filter(Boolean).join(' ')).includes(busca);
}

// Procura em OS, clientes e equipamentos ao mesmo tempo. Usa as mesmas consultas
// (e o mesmo cache) das listas, então não pesa no banco.
function useResultados(termo: string, aberta: boolean) {
  const organizacao = useOrganizacao();
  const busca = normalizarParaBusca(termo);
  const ativa = aberta && busca.length >= 2;

  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
    enabled: aberta,
  });
  const clientes = useQuery({
    queryKey: chaves.clientes(organizacao.id),
    queryFn: () => listarClientes(organizacao.id),
    enabled: aberta,
  });
  const equipamentos = useQuery({
    queryKey: chaves.equipamentos(organizacao.id),
    queryFn: () => listarEquipamentos(organizacao.id),
    enabled: aberta,
  });

  if (!ativa) return { busca, grupos: [] };

  const grupos: { titulo: string; icone: LucideIcon; itens: Resultado[] }[] = [
    {
      titulo: 'Ordens de serviço',
      icone: ClipboardList,
      itens: (ordens.data ?? [])
        .filter((ordem) =>
          contem(
            [
              formatarNumeroOrdem(ordem.numero),
              String(ordem.numero),
              ordem.clienteNome,
              ordem.localNome,
              ordem.problema,
            ],
            busca,
          ),
        )
        .map((ordem) => ({
          id: ordem.id,
          titulo: `${formatarNumeroOrdem(ordem.numero)} · ${ordem.clienteNome}`,
          detalhe: ordem.problema,
          para: `/ordens/${ordem.id}`,
          status: ordem.status,
        })),
    },
    {
      titulo: 'Clientes',
      icone: Users,
      itens: (clientes.data ?? [])
        .filter((cliente) => contem([cliente.nome, cliente.documento, cliente.contatoNome], busca))
        .map((cliente) => ({
          id: cliente.id,
          titulo: cliente.nome,
          detalhe: cliente.ativo ? (cliente.contatoNome ?? '') : 'Arquivado',
          para: `/clientes/${cliente.id}`,
        })),
    },
    {
      titulo: 'Equipamentos',
      icone: AirVent,
      itens: (equipamentos.data ?? [])
        .filter((equipamento) =>
          contem(
            [
              equipamento.identificacao,
              equipamento.patrimonio,
              equipamento.numeroSerie,
              equipamento.clienteNome,
            ],
            busca,
          ),
        )
        .map((equipamento) => ({
          id: equipamento.id,
          titulo: equipamento.identificacao,
          detalhe: `${equipamento.clienteNome} · ${equipamento.localNome}`,
          para: `/equipamentos/${equipamento.id}`,
        })),
    },
  ];

  return { busca, grupos: grupos.filter((grupo) => grupo.itens.length > 0) };
}

export function BuscaGeral() {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState('');
  const navegar = useNavigate();
  const { busca, grupos } = useResultados(termo, aberta);

  // Ctrl+K (ou Cmd+K no Mac) abre a busca de qualquer tela.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key.toLowerCase() === 'k' && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault();
        setAberta(true);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  function mudarAberta(valor: boolean) {
    setAberta(valor);
    if (!valor) setTermo('');
  }

  function ir(para: string) {
    mudarAberta(false);
    navegar(para);
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-9 justify-start px-0 text-muted-foreground sm:w-64 sm:px-3"
        onClick={() => setAberta(true)}
        aria-label="Buscar"
      >
        <Search className="mx-auto sm:mx-0" />
        <span className="hidden sm:inline">Buscar OS, cliente, equipamento…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] lg:inline">
          Ctrl K
        </kbd>
      </Button>

      <Dialog open={aberta} onOpenChange={mudarAberta}>
        <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Buscar</DialogTitle>
          <DialogDescription className="sr-only">
            Procure ordens de serviço, clientes e equipamentos.
          </DialogDescription>
          <div className="relative border-b">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              type="search"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Número da OS, cliente, patrimônio…"
              aria-label="Termo de busca"
              className="h-12 rounded-none border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {busca.length < 2 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 letras.
              </p>
            ) : grupos.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nada encontrado para “{termo.trim()}”.
              </p>
            ) : (
              grupos.map((grupo) => (
                <section key={grupo.titulo} className="mb-2" aria-label={grupo.titulo}>
                  <h2 className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <grupo.icone className="size-3.5" aria-hidden />
                    {grupo.titulo}
                  </h2>
                  <ul>
                    {grupo.itens.slice(0, MAXIMO_POR_GRUPO).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => ir(item.para)}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {item.titulo}
                            </span>
                            {item.detalhe && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.detalhe}
                              </span>
                            )}
                          </span>
                          {item.status && <EtiquetaStatus status={item.status} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
