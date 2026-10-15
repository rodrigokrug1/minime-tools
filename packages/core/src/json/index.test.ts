import { describe, expect, it } from 'vitest';
import { formatarJson, formatarJsonOrdenado, minificarJson, ordenarChaves } from './index.js';

describe('formatarJson', () => {
  it('identa com dois espaços por padrão', () => {
    const resultado = formatarJson('{"a":1}');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.saida).toBe('{\n  "a": 1\n}');
  });

  it('respeita o número de espaços pedido', () => {
    const resultado = formatarJson('{"a":1}', 4);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.saida).toBe('{\n    "a": 1\n}');
  });

  it('recusa entrada vazia com mensagem própria', () => {
    const resultado = formatarJson('   ');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.mensagem).toContain('Cole um JSON');
  });

  it('aponta a linha e a coluna do token problemático', () => {
    //  O '}' solto está na terceira linha, coluna 8.
    const resultado = formatarJson('{\n  "a": 1,\n  "b": }\n}');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro.linha).toBe(3);
      expect(resultado.erro.coluna).toBe(8);
      expect(resultado.erro.trecho.length).toBeGreaterThan(0);
    }
  });

  it('aponta o erro quando ele está logo no início', () => {
    const resultado = formatarJson('{"a":}');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro.linha).toBe(1);
      expect(resultado.erro.coluna).toBe(6);
    }
  });

  it('aponta o fim do texto quando o JSON foi cortado', () => {
    const resultado = formatarJson('{"a": [1, 2');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.coluna).toBe(12);
  });
});

describe('minificarJson', () => {
  it('remove espaços e quebras', () => {
    const resultado = minificarJson('{\n  "a": [1, 2]\n}');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.saida).toBe('{"a":[1,2]}');
  });

  it('propaga erro de sintaxe', () => {
    expect(minificarJson('{nao é json}').ok).toBe(false);
  });
});

describe('ordenarChaves', () => {
  it('ordena em qualquer profundidade', () => {
    const entrada = { b: 1, a: { d: 2, c: 3 } };

    expect(JSON.stringify(ordenarChaves(entrada))).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('preserva a ordem dos arrays', () => {
    expect(ordenarChaves([3, 1, 2])).toEqual([3, 1, 2]);
  });

  it('não quebra com null', () => {
    expect(ordenarChaves({ a: null })).toEqual({ a: null });
  });

  it('ordena objetos dentro de arrays', () => {
    const resultado = formatarJsonOrdenado('[{"z":1,"a":2}]', 0);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.saida).toBe('[{"a":2,"z":1}]');
  });
});
