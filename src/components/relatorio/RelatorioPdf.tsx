import interNegrito from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import interNormal from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { DadosRelatorio } from '@/domain/ordem/relatorio';

// Relatório de atendimento em PDF (etapa 5), montado no próprio aparelho.
// Só o desenho; quem gera o arquivo é gerarRelatorioPdf.ts.

// Fonte embutida (a mesma do app): as fontes padrão do PDF não têm travessão, marcador nem
// as aspas e hífens "tipográficos" que o celular coloca sozinho ao digitar, e alguns
// visualizadores nem as desenham.
Font.register({
  family: 'Inter',
  fonts: [
    { src: interNormal, fontWeight: 400 },
    { src: interNegrito, fontWeight: 700 },
  ],
});
// Sem hifenização automática: "Centro" não vira "Cen- tro" no endereço.
Font.registerHyphenationCallback((palavra) => [palavra]);

const AZUL = '#0b3fd6';
const CINZA = '#6b7280';
const BORDA = '#e5e7eb';

const estilos = StyleSheet.create({
  // Sem lineHeight na página: com ele, a biblioteca desenha o rodapé fixo fora da área visível.
  pagina: { padding: 32, paddingBottom: 44, fontSize: 9.5, fontFamily: 'Inter', color: '#111827' },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: AZUL,
    paddingBottom: 8,
    marginBottom: 12,
  },
  empresa: { fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 },
  subtitulo: { fontSize: 10, color: CINZA },
  numero: {
    fontSize: 14,
    fontWeight: 700,
    color: AZUL,
    textAlign: 'right',
    lineHeight: 1.2,
    marginBottom: 2,
  },
  secao: { marginBottom: 10 },
  tituloSecao: {
    fontSize: 10.5,
    fontWeight: 700,
    color: AZUL,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  linha: { flexDirection: 'row', marginBottom: 2 },
  rotulo: { width: 110, color: CINZA },
  valor: { flex: 1 },
  colunas: { flexDirection: 'row', gap: 16 },
  coluna: { flex: 1 },
  itemChecklist: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
  },
  textoItem: { flex: 1, paddingRight: 8 },
  resposta: { width: 80, fontWeight: 700 },
  naoConforme: { color: '#b91c1c' },
  observacao: { color: CINZA, fontSize: 8.5, marginTop: 1 },
  assinatura: { width: 180, height: 80, objectFit: 'contain', marginVertical: 4 },
  linhaAssinatura: { width: 220, borderTopWidth: 1, borderTopColor: '#111827', paddingTop: 2 },
  // Rodapé fixo (repetido em toda página): não herda a fonte da página.
  rodape: {
    fontFamily: 'Inter',
    position: 'absolute',
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7.5,
    color: CINZA,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.secao} wrap={false}>
      <Text style={estilos.tituloSecao}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

export function RelatorioPdf({ dados }: { dados: DadosRelatorio }) {
  return (
    <Document title={`${dados.numero} — ${dados.cliente}`} author={dados.empresa} language="pt-BR">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View>
            <Text style={estilos.empresa}>{dados.empresa}</Text>
            <Text style={estilos.subtitulo}>Relatório de atendimento</Text>
          </View>
          <View>
            <Text style={estilos.numero}>{dados.numero}</Text>
            <Text style={[estilos.subtitulo, { textAlign: 'right' }]}>{dados.tipoServico}</Text>
          </View>
        </View>

        <View style={estilos.colunas}>
          <View style={estilos.coluna}>
            <Secao titulo="Cliente">
              <Campo rotulo="Cliente" valor={dados.cliente} />
              <Campo rotulo="Local" valor={dados.local} />
              <Campo rotulo="Endereço" valor={dados.endereco} />
              <Campo rotulo="Solicitante" valor={dados.solicitante} />
            </Secao>
          </View>
          <View style={estilos.coluna}>
            <Secao titulo="Atendimento">
              <Campo rotulo="Técnico" valor={dados.tecnico} />
              <Campo rotulo="Início" valor={dados.inicio} />
              <Campo rotulo="Conclusão" valor={dados.fim} />
              <Campo rotulo="Tempo trabalhado" valor={dados.tempoTrabalhado} />
            </Secao>
          </View>
        </View>

        {dados.equipamentos.length > 0 && (
          <Secao titulo="Equipamentos atendidos">
            {dados.equipamentos.map((equipamento) => (
              <Text key={equipamento}>• {equipamento}</Text>
            ))}
          </Secao>
        )}

        <Secao titulo="Problema relatado">
          <Text>{dados.problema}</Text>
        </Secao>

        {dados.checklist.length > 0 && (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Checklist</Text>
            {dados.checklist.map((item, indice) => (
              <View key={indice} style={estilos.itemChecklist} wrap={false}>
                <View style={estilos.textoItem}>
                  <Text>
                    {indice + 1}. {item.item}
                  </Text>
                  {item.observacao && (
                    <Text style={estilos.observacao}>Observação: {item.observacao}</Text>
                  )}
                </View>
                <Text
                  style={[
                    estilos.resposta,
                    item.resposta === 'Não conforme' ? estilos.naoConforme : {},
                  ]}
                >
                  {item.resposta}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Secao titulo="Diagnóstico">
          <Text>{dados.diagnostico ?? 'Não informado'}</Text>
        </Secao>

        {dados.atividades.length > 0 && (
          <Secao titulo="Atividades realizadas">
            {dados.atividades.map((atividade, indice) => (
              <Text key={indice}>• {atividade}</Text>
            ))}
          </Secao>
        )}

        {dados.materiais && (
          <Secao titulo="Materiais utilizados">
            <Text>{dados.materiais}</Text>
          </Secao>
        )}

        {dados.assinatura && (
          <Secao titulo="Assinatura do cliente">
            {dados.assinatura.tipo === 'assinada' ? (
              <View>
                {dados.assinatura.imagem && (
                  <Image src={dados.assinatura.imagem} style={estilos.assinatura} />
                )}
                <View style={estilos.linhaAssinatura}>
                  <Text>{dados.assinatura.nome}</Text>
                  <Text style={estilos.observacao}>Assinado em {dados.assinatura.data}</Text>
                </View>
              </View>
            ) : (
              <Text>
                Sem assinatura do cliente. Motivo: {dados.assinatura.motivo} (registrado em{' '}
                {dados.assinatura.data})
              </Text>
            )}
          </Secao>
        )}
        <View style={estilos.rodape} fixed>
          <Text>Gerado pelo AirOps em {dados.geradoEm}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
