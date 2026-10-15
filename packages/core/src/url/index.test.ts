import { describe, expect, it } from 'vitest';
import { normalizarUrl, validarUrl } from './index.js';

describe('normalizarUrl', () => {
  it('devolve string vazia para entrada em branco', () => {
    expect(normalizarUrl('   ')).toBe('');
  });

  it('acrescenta https quando falta o esquema', () => {
    expect(normalizarUrl('exemplo.com/promo')).toBe('https://exemplo.com/promo');
  });

  it('preserva o esquema existente', () => {
    expect(normalizarUrl('http://exemplo.com')).toBe('http://exemplo.com');
  });

  it('não mascara esquemas sem barras, para o validador poder recusá-los', () => {
    expect(normalizarUrl('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(normalizarUrl('mailto:alguem@exemplo.com')).toBe('mailto:alguem@exemplo.com');
  });

  it('remove espaços em volta', () => {
    expect(normalizarUrl('  https://exemplo.com  ')).toBe('https://exemplo.com');
  });
});

describe('validarUrl', () => {
  it('aceita uma URL https comum', () => {
    const resultado = validarUrl('https://exemplo.com/caminho?a=1');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.url.hostname).toBe('exemplo.com');
  });

  it('aceita URL sem esquema', () => {
    expect(validarUrl('exemplo.com').ok).toBe(true);
  });

  it('recusa entrada vazia', () => {
    expect(validarUrl('')).toEqual({ ok: false, motivo: 'vazia' });
  });

  it.each(['javascript:alert(1)', 'mailto:alguem@exemplo.com', 'data:text/html,<p>'])(
    'recusa o esquema de %s',
    (entrada) => {
      expect(validarUrl(entrada)).toEqual({ ok: false, motivo: 'esquema-nao-suportado' });
    },
  );

  it.each([
    'http://localhost:3000',
    'http://app.localhost',
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://192.168.1.1',
    'http://172.16.0.1',
    'http://169.254.169.254',
  ])('recusa o host local %s', (entrada) => {
    expect(validarUrl(entrada)).toEqual({ ok: false, motivo: 'host-local' });
  });

  it('aceita 172.32.0.1, que está fora da faixa privada', () => {
    expect(validarUrl('http://172.32.0.1').ok).toBe(true);
  });

  it.each(['https://minime.cloud/abc', 'https://link.minime.cloud/abc'])(
    'recusa o próprio domínio em %s',
    (entrada) => {
      expect(validarUrl(entrada)).toEqual({ ok: false, motivo: 'host-proprio' });
    },
  );

  it('ignora diferença de caixa no host', () => {
    expect(validarUrl('https://LINK.MINIME.CLOUD/abc')).toEqual({
      ok: false,
      motivo: 'host-proprio',
    });
  });

  it('recusa texto que não é URL', () => {
    expect(validarUrl('isso não é uma url').ok).toBe(false);
  });
});
