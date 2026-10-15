import { describe, expect, it } from 'vitest';
import {
  codificarBase64,
  decodificarBase64,
  decodificarParaHex,
  pareceBase64Url,
} from './index.js';

describe('codificarBase64', () => {
  it('codifica ASCII', () => {
    const resultado = codificarBase64('Hello, World!');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.saida).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('codifica acento como UTF-8, diferente do btoa cru', () => {
    const resultado = codificarBase64('ação');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.saida).toBe('YcOnw6Nv');

    // btoa não lança aqui, porque ç e ã cabem em Latin-1 — ele silenciosamente
    // grava um byte por caractere e produz outro resultado. É o caso
    // traiçoeiro: a conversão "funciona" e o dado volta corrompido.
    expect(btoa('ação')).toBe('Yefjbw==');
  });

  it('codifica caractere fora de Latin-1, que faz btoa lançar', () => {
    const resultado = codificarBase64('日本語');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(decodificarBase64(resultado.saida)).toEqual({ ok: true, saida: '日本語' });
    expect(() => btoa('日本語')).toThrow();
  });

  it('codifica emoji', () => {
    const resultado = codificarBase64('🇧🇷');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(decodificarBase64(resultado.saida)).toEqual({ ok: true, saida: '🇧🇷' });
  });

  it('produz Base64URL sem preenchimento quando pedido', () => {
    const resultado = codificarBase64('Hello, World!', true);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.saida).toBe('SGVsbG8sIFdvcmxkIQ');
    expect(resultado.saida).not.toContain('=');
  });

  it('troca + e / por - e _ no modo URL', () => {
    // Estes bytes produzem + e / no alfabeto padrão.
    const padrao = codificarBase64('ûÿ¾');
    const url = codificarBase64('ûÿ¾', true);

    if (!padrao.ok || !url.ok) throw new Error('esperava sucesso');
    expect(url.saida).not.toMatch(/[+/]/);
  });

  it('recusa entrada vazia', () => {
    expect(codificarBase64('')).toEqual({ ok: false, motivo: 'vazio' });
  });

  it('aguenta texto longo sem estourar a pilha', () => {
    const longo = 'a'.repeat(200_000);
    const resultado = codificarBase64(longo);

    expect(resultado.ok).toBe(true);
    if (resultado.ok)
      expect(decodificarBase64(resultado.saida)).toEqual({ ok: true, saida: longo });
  });
});

describe('decodificarBase64', () => {
  it('decodifica Base64 padrão', () => {
    expect(decodificarBase64('SGVsbG8sIFdvcmxkIQ==')).toEqual({ ok: true, saida: 'Hello, World!' });
  });

  it('decodifica Base64URL sem preenchimento', () => {
    expect(decodificarBase64('SGVsbG8sIFdvcmxkIQ')).toEqual({ ok: true, saida: 'Hello, World!' });
  });

  it('ignora espaços e quebras de linha', () => {
    expect(decodificarBase64('SGVsbG8s\n IFdvcmxk\tIQ==')).toEqual({
      ok: true,
      saida: 'Hello, World!',
    });
  });

  it('restaura acento corretamente', () => {
    expect(decodificarBase64('YcOnw6Nv')).toEqual({ ok: true, saida: 'ação' });
  });

  it('recusa caractere fora do alfabeto', () => {
    const resultado = decodificarBase64('SGVsbG8*');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('caracteres');
  });

  it('recusa comprimento que não fecha', () => {
    const resultado = decodificarBase64('SGVsbG8sIFdvcmxkIQ===');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(['caracteres', 'tamanho']).toContain(resultado.motivo);
  });

  it('avisa quando os bytes não formam UTF-8', () => {
    // 0xFF sozinho não é sequência UTF-8 válida.
    const resultado = decodificarBase64('/w==');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('utf8');
  });

  it('recusa entrada vazia ou só espaços', () => {
    expect(decodificarBase64('   ')).toEqual({ ok: false, motivo: 'vazio' });
  });

  it('faz ida e volta com qualquer texto', () => {
    for (const texto of ['a', 'ab', 'abc', 'çãé', '日本語', 'linha1\nlinha2']) {
      const codificado = codificarBase64(texto);

      if (!codificado.ok) throw new Error('esperava sucesso');
      expect(decodificarBase64(codificado.saida)).toEqual({ ok: true, saida: texto });
    }
  });
});

describe('decodificarParaHex', () => {
  it('mostra os bytes em hexadecimal', () => {
    expect(decodificarParaHex('SGVsbG8=')).toEqual({ ok: true, saida: '48 65 6c 6c 6f' });
  });

  it('funciona com bytes que não são texto', () => {
    expect(decodificarParaHex('/w==')).toEqual({ ok: true, saida: 'ff' });
  });
});

describe('pareceBase64Url', () => {
  it('reconhece o alfabeto URL', () => {
    expect(pareceBase64Url('abc-def_gh')).toBe(true);
  });

  it('não confunde com o alfabeto padrão', () => {
    expect(pareceBase64Url('abc+def/gh')).toBe(false);
    expect(pareceBase64Url('SGVsbG8=')).toBe(false);
  });
});
