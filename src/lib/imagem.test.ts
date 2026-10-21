import { describe, expect, it } from 'vitest';
import { dimensoesReduzidas } from './imagem';

describe('dimensoesReduzidas', () => {
  it('reduz o maior lado para 1600 mantendo a proporção', () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ largura: 1600, altura: 1200 });
    expect(dimensoesReduzidas(3000, 4000)).toEqual({ largura: 1200, altura: 1600 });
  });

  it('não amplia fotos pequenas', () => {
    expect(dimensoesReduzidas(800, 600)).toEqual({ largura: 800, altura: 600 });
  });
});
