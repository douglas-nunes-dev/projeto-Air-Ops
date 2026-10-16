import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Inicio } from './Inicio';

describe('Inicio', () => {
  it('mostra o nome do sistema e a data em português', () => {
    render(<Inicio />);

    expect(screen.getByText('AirOps')).toBeDefined();
    expect(screen.getByText(/ de \d{4}$/)).toBeDefined();
    expect(screen.getByRole('button', { name: /testar/i })).toBeDefined();
  });
});
