import { describe, expect, it } from 'vitest';
import { decodificarJwt } from './index.js';

/** Monta um JWT de teste. A assinatura é texto arbitrário: nada a verifica. */
function montar(header: unknown, payload: unknown, assinatura = 'assinatura'): string {
  const codificar = (valor: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(valor))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${codificar(header)}.${codificar(payload)}.${assinatura}`;
}

describe('decodificarJwt', () => {
  it('decodifica header e payload', () => {
    const token = montar({ alg: 'HS256', typ: 'JWT' }, { sub: '123', nome: 'Fulano' });
    const resultado = decodificarJwt(token);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.token.header.alg).toBe('HS256');
      expect(resultado.token.payload.sub).toBe('123');
    }
  });

  it('aceita o prefixo Bearer', () => {
    const token = montar({ alg: 'none' }, { a: 1 });

    expect(decodificarJwt(`Bearer ${token}`).ok).toBe(true);
  });

  it('preserva acentos no payload', () => {
    const token = montar({ alg: 'HS256' }, { nome: 'João Conceição' });
    const resultado = decodificarJwt(token);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.token.payload.nome).toBe('João Conceição');
  });

  it('converte iat, exp e nbf em datas', () => {
    const token = montar({ alg: 'HS256' }, { iat: 1700000000, exp: 1800000000, nbf: 1700000000 });
    const resultado = decodificarJwt(token, new Date(1750000000 * 1000));

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.token.emitidoEm?.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(resultado.token.validoApartirDe).toBeInstanceOf(Date);
    expect(resultado.token.expirado).toBe(false);
  });

  it('marca como expirado quando exp já passou', () => {
    const token = montar({ alg: 'HS256' }, { exp: 1700000000 });
    const resultado = decodificarJwt(token, new Date(1800000000 * 1000));

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.token.expirado).toBe(true);
  });

  it('não inventa datas quando os claims faltam', () => {
    const resultado = decodificarJwt(montar({ alg: 'HS256' }, { sub: 'x' }));

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.token.expiraEm).toBeUndefined();
    expect(resultado.token.expirado).toBeUndefined();
  });

  it('guarda a assinatura sem tentar decodificá-la', () => {
    const resultado = decodificarJwt(montar({ alg: 'HS256' }, {}, 'abc123'));

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.token.assinatura).toBe('abc123');
  });

  it('recusa entrada vazia', () => {
    const resultado = decodificarJwt('  ');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('vazio');
  });

  it('recusa número de partes diferente de três', () => {
    const resultado = decodificarJwt('abc.def');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('partes');
  });

  it('recusa payload que não é JSON', () => {
    const naoJson = btoa('isso não é json').replace(/=+$/, '');
    const resultado = decodificarJwt(`${naoJson}.${naoJson}.x`);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(['base64', 'json']).toContain(resultado.motivo);
  });
});
