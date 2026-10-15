import { describe, expect, it } from 'vitest';
import { calcularLayout, comprimentoDaLinha, type OpcoesLayout } from './layout.js';
import { tokenizar } from './tokens.js';

const BASE: OpcoesLayout = {
  corpo: 15,
  larguraCaractere: 9,
  mostrarNumeros: true,
  mostrarCromo: true,
  margem: 32,
};

describe('comprimentoDaLinha', () => {
  it('soma o texto de todos os tokens', () => {
    const [linha] = tokenizar('const x = 1;', 'javascript');

    expect(comprimentoDaLinha(linha ?? [])).toBe('const x = 1;'.length);
  });

  it('é zero numa linha vazia', () => {
    expect(comprimentoDaLinha([])).toBe(0);
  });
});

describe('calcularLayout', () => {
  it('dimensiona pela linha mais longa', () => {
    const curto = calcularLayout(tokenizar('a', 'texto'), BASE);
    const longo = calcularLayout(tokenizar('a'.repeat(50), 'texto'), BASE);

    expect(longo.largura - curto.largura).toBe(49 * BASE.larguraCaractere);
  });

  it('cresce em altura a cada linha', () => {
    const uma = calcularLayout(tokenizar('a', 'texto'), BASE);
    const tres = calcularLayout(tokenizar('a\nb\nc', 'texto'), BASE);

    expect(tres.altura - uma.altura).toBe(2 * uma.alturaLinha);
  });

  it('reserva calha proporcional ao maior número de linha', () => {
    const comLinhas = (quantidade: number) =>
      calcularLayout(
        tokenizar(Array.from({ length: quantidade }, () => 'a').join('\n'), 'texto'),
        BASE,
      );

    const dezLinhas = comLinhas(10);
    const cemLinhas = comLinhas(100);

    expect(dezLinhas.digitos).toBe(2);
    expect(cemLinhas.digitos).toBe(3);
    expect(cemLinhas.calha - dezLinhas.calha).toBe(BASE.larguraCaractere);
  });

  it('zera a calha quando a numeração está desligada', () => {
    const layout = calcularLayout(tokenizar('a', 'texto'), { ...BASE, mostrarNumeros: false });

    expect(layout.calha).toBe(0);
  });

  it('zera o cromo quando desligado, encolhendo a janela', () => {
    const com = calcularLayout(tokenizar('a', 'texto'), BASE);
    const sem = calcularLayout(tokenizar('a', 'texto'), { ...BASE, mostrarCromo: false });

    expect(sem.cromo).toBe(0);
    expect(com.janelaAltura - sem.janelaAltura).toBe(com.cromo);
  });

  it('a margem aparece dos dois lados', () => {
    const sem = calcularLayout(tokenizar('a', 'texto'), { ...BASE, margem: 0 });
    const com = calcularLayout(tokenizar('a', 'texto'), { ...BASE, margem: 40 });

    expect(com.largura - sem.largura).toBe(80);
    expect(com.altura - sem.altura).toBe(80);
  });

  it('a janela cabe dentro da imagem', () => {
    const layout = calcularLayout(tokenizar('const x = 1;\nconst y = 2;', 'javascript'), BASE);

    expect(layout.janelaX + layout.janelaLargura).toBeLessThanOrEqual(layout.largura);
    expect(layout.janelaY + layout.janelaAltura).toBeLessThanOrEqual(layout.altura);
  });

  it('o código começa depois do cromo e da calha', () => {
    const layout = calcularLayout(tokenizar('a', 'texto'), BASE);

    expect(layout.codigoX).toBeGreaterThan(layout.janelaX + layout.calha);
    expect(layout.codigoY).toBeGreaterThan(layout.janelaY + layout.cromo);
  });

  it('nunca devolve dimensão zero, mesmo sem código', () => {
    const layout = calcularLayout(tokenizar('', 'texto'), BASE);

    expect(layout.largura).toBeGreaterThan(0);
    expect(layout.altura).toBeGreaterThan(0);
  });
});
