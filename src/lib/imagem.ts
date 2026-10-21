// Redução das fotos no próprio celular antes de guardar e enviar: uma foto de câmera tem
// de 3 a 8 MB; reduzida, fica em torno de 300 KB e continua nítida para o relatório.

export const LADO_MAXIMO = 1600;
const QUALIDADE_JPEG = 0.8;

/** Novo tamanho mantendo a proporção; fotos menores que o limite não são ampliadas. */
export function dimensoesReduzidas(
  largura: number,
  altura: number,
  ladoMaximo = LADO_MAXIMO,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaximo) return { largura, altura };
  const escala = ladoMaximo / maior;
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}

/** Converte para JPEG reduzido, já na orientação certa (fotos de celular vêm "deitadas"). */
export async function reduzirFoto(arquivo: Blob): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const { largura, altura } = dimensoesReduzidas(imagem.width, imagem.height);

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('Não foi possível preparar a foto.');
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();

  return new Promise((resolver, rejeitar) => {
    tela.toBlob(
      (jpeg) => (jpeg ? resolver(jpeg) : rejeitar(new Error('Não foi possível preparar a foto.'))),
      'image/jpeg',
      QUALIDADE_JPEG,
    );
  });
}
