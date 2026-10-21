import { describe, expect, it } from 'vitest';
import { saudacao } from '@/domain/comum/saudacao';
import { arredondarCoordenadas, descreverTempo } from './tipos';

describe('saudação', () => {
  it('bom dia de manhã, boa tarde à tarde e boa noite no resto', () => {
    const as = (hora: number) => saudacao(new Date(2026, 9, 20, hora, 30));
    expect(as(4)).toBe('Boa noite');
    expect(as(5)).toBe('Bom dia');
    expect(as(11)).toBe('Bom dia');
    expect(as(12)).toBe('Boa tarde');
    expect(as(17)).toBe('Boa tarde');
    expect(as(18)).toBe('Boa noite');
    expect(as(23)).toBe('Boa noite');
  });
});

describe('clima', () => {
  it('traduz os códigos de tempo da WMO', () => {
    expect(descreverTempo(0)).toEqual({ categoria: 'limpo', descricao: 'Céu limpo' });
    expect(descreverTempo(3).descricao).toBe('Nublado');
    expect(descreverTempo(63).categoria).toBe('chuva');
    expect(descreverTempo(81).descricao).toBe('Pancadas de chuva');
    expect(descreverTempo(99).descricao).toBe('Trovoada com granizo');
    expect(descreverTempo(1234).descricao).toBe('Tempo indefinido');
  });

  it('não envia a posição exata: arredonda para cerca de 1 km', () => {
    expect(arredondarCoordenadas({ latitude: -20.718934, longitude: -46.609712 })).toEqual({
      latitude: -20.72,
      longitude: -46.61,
    });
  });
});
