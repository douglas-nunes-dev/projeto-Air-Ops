/** Lê um arquivo como "data URL" (texto base64), para embutir imagens no PDF. */
export function blobParaDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(leitor.error ?? new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * No celular, abre o menu de compartilhar do aparelho (WhatsApp, e-mail…); onde não houver
 * (ex.: computador), baixa o arquivo. Devolve como foi entregue.
 */
export async function compartilharOuBaixar(
  arquivo: Blob,
  nome: string,
): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const comNome = new File([arquivo], nome, { type: arquivo.type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [comNome] })) {
    try {
      await navigator.share({ files: [comNome], title: nome });
      return 'compartilhado';
    } catch (erro) {
      // A pessoa fechou o menu sem escolher: não é erro.
      if (erro instanceof DOMException && erro.name === 'AbortError') return 'cancelado';
      throw erro;
    }
  }

  const endereco = URL.createObjectURL(comNome);
  const link = document.createElement('a');
  link.href = endereco;
  link.download = nome;
  link.click();
  // Dá tempo de o navegador começar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
  return 'baixado';
}
