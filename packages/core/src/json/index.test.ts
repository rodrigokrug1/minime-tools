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

describe('JSON escapado', () => {
  // Montado a partir do objeto, nunca escrito à mão: contar contrabarra em
  // literal de teste é a forma clássica de testar a coisa errada.
  const original = {
    status: 'PAYMENT_SUCCESS',
    caminho: 'C:\\temp\\recibo.txt',
    nota: 'primeira linha\nsegunda linha',
    aspas: 'ele disse "oi"',
    acento: 'operação',
    itens: [{ valor: 40025, moeda: 'BRL' }],
  };

  const documento = JSON.stringify(original);
  /** Como sai de um log: escapado e com as aspas externas. */
  const comAspas = JSON.stringify(documento);
  /** Como costuma ser colado: escapado, sem as aspas externas. */
  const semAspas = comAspas.slice(1, -1);

  it('desembrulha JSON escapado sem as aspas externas', () => {
    const resultado = formatarJson(semAspas);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(JSON.parse(resultado.saida)).toEqual(original);
    expect(resultado.desescapado).toBe(true);
  });

  it('desembrulha JSON escapado com as aspas externas', () => {
    const resultado = formatarJson(comAspas);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(JSON.parse(resultado.saida)).toEqual(original);
    expect(resultado.desescapado).toBe(true);
  });

  it('preserva contrabarra, quebra de linha e aspas internas', () => {
    const resultado = formatarJson(semAspas);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const voltou = JSON.parse(resultado.saida) as typeof original;

    // O replace ingênuo de \" por " corrompe exatamente estes três campos.
    expect(voltou.caminho).toBe('C:\\temp\\recibo.txt');
    expect(voltou.nota).toBe('primeira linha\nsegunda linha');
    expect(voltou.aspas).toBe('ele disse "oi"');
    expect(voltou.acento).toBe('operação');
  });

  it('não marca desescapado quando o JSON já vem limpo', () => {
    const resultado = formatarJson(documento);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.desescapado).toBe(false);
  });

  it('não desembrulha documento que é só uma string ou um número', () => {
    for (const entrada of ['"42"', '"texto solto"', '42']) {
      const resultado = formatarJson(entrada);

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) continue;

      expect(resultado.desescapado).toBe(false);
      expect(JSON.parse(resultado.saida)).toEqual(JSON.parse(entrada));
    }
  });

  it('continua reportando o erro original quando nem desescapado vale', () => {
    const resultado = formatarJson('{\\"a\\": }');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    expect(resultado.erro.mensagem).toBeTruthy();
  });

  it('vale para minificar e para ordenar chaves', () => {
    const minificado = minificarJson(semAspas);
    expect(minificado.ok).toBe(true);
    if (minificado.ok) {
      expect(JSON.parse(minificado.saida)).toEqual(original);
      expect(minificado.desescapado).toBe(true);
    }

    const ordenado = formatarJsonOrdenado(semAspas);
    expect(ordenado.ok).toBe(true);
    if (ordenado.ok) {
      expect(JSON.parse(ordenado.saida)).toEqual(original);
      expect(ordenado.desescapado).toBe(true);
      expect(Object.keys(JSON.parse(ordenado.saida))).toEqual([
        'acento',
        'aspas',
        'caminho',
        'itens',
        'nota',
        'status',
      ]);
    }
  });
});
