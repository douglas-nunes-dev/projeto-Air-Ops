import { pdf, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DadosRelatorio } from '@/domain/ordem/relatorio';
import { RelatorioPdf } from './RelatorioPdf';

// Gera o arquivo do relatório (etapa 5) no próprio aparelho.
// Este módulo é carregado só quando alguém pede o relatório (a biblioteca de PDF é pesada).
export async function gerarRelatorioPdf(dados: DadosRelatorio): Promise<Blob> {
  // RelatorioPdf devolve um <Document>, que é o que a biblioteca espera.
  const documento = createElement(RelatorioPdf, { dados }) as ReactElement<DocumentProps>;
  return pdf(documento).toBlob();
}
