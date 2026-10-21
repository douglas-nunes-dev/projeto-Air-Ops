import { afterEach, describe, expect, it, vi } from 'vitest';
import { gerarId } from './identificador';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('gerarId', () => {
  it('gera UUID v4', () => {
    expect(gerarId()).toMatch(UUID_V4);
  });

  it('funciona também sem crypto.randomUUID (endereço http da rede local)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = new Set(Array.from({ length: 50 }, gerarId));
    expect([...ids].every((id) => UUID_V4.test(id))).toBe(true);
    expect(ids.size).toBe(50);
  });
});
