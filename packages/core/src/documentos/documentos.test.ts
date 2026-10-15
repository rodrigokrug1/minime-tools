import { describe, expect, it } from 'vitest';
import { formatarCnpj, gerarCnpj, validarCnpj } from './cnpj.js';
import { formatarCpf, gerarCpf, validarCpf } from './cpf.js';
import { digitoModulo11, valorDoCaractere } from './dv.js';

describe('digitoModulo11', () => {
  it('devolve zero para resto 0 e 1', () => {
    expect(digitoModulo11(0)).toBe(0);
    expect(digitoModulo11(1)).toBe(0);
  });

  it('devolve 11 menos o resto a partir de 2', () => {
    expect(digitoModulo11(2)).toBe(9);
    expect(digitoModulo11(9)).toBe(2);
  });
});

describe('valorDoCaractere', () => {
  it('mapeia dígitos para o próprio valor', () => {
    expect(valorDoCaractere('0')).toBe(0);
    expect(valorDoCaractere('9')).toBe(9);
  });

  it('mapeia letras pelo ASCII menos 48', () => {
    expect(valorDoCaractere('A')).toBe(17);
    expect(valorDoCaractere('Z')).toBe(42);
  });
});

describe('validarCpf', () => {
  it('aceita um CPF válido com máscara', () => {
    const resultado = validarCpf('529.982.247-25');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.formatado).toBe('529.982.247-25');
  });

  it('aceita o mesmo CPF sem máscara', () => {
    expect(validarCpf('52998224725').ok).toBe(true);
  });

  it('expõe a conta dos dois dígitos', () => {
    const resultado = validarCpf('52998224725');
    const [primeiro, segundo] = resultado.passos;

    expect(primeiro?.soma).toBe(295);
    expect(primeiro?.resto).toBe(9);
    expect(primeiro?.esperado).toBe(2);
    expect(segundo?.soma).toBe(347);
    expect(segundo?.resto).toBe(6);
    expect(segundo?.esperado).toBe(5);
  });

  it('recusa quando o dígito não bate e mostra a conta mesmo assim', () => {
    const resultado = validarCpf('52998224726');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('digito-nao-confere');
    expect(resultado.passos).toHaveLength(2);
  });

  it.each(['00000000000', '11111111111', '99999999999'])('recusa a sequência %s', (entrada) => {
    const resultado = validarCpf(entrada);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('repetido');
  });

  it('recusa tamanho errado', () => {
    const resultado = validarCpf('5299822472');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('tamanho');
  });

  it('recusa letras', () => {
    const resultado = validarCpf('5299822472A');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('caracteres');
  });

  it('recusa entrada vazia', () => {
    const resultado = validarCpf('   ');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('vazio');
  });
});

describe('gerarCpf', () => {
  it('gera CPFs que passam na própria validação', () => {
    for (let i = 0; i < 300; i += 1) {
      const { cru, formatado } = gerarCpf();

      expect(cru).toMatch(/^\d{11}$/);
      expect(validarCpf(cru).ok).toBe(true);
      expect(formatado).toBe(formatarCpf(cru));
    }
  });
});

describe('validarCnpj', () => {
  it('aceita um CNPJ numérico válido', () => {
    const resultado = validarCnpj('11.222.333/0001-81');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.alfanumerico).toBe(false);
  });

  // Exemplo publicado pela Receita Federal no material do CNPJ alfanumérico.
  it('aceita o exemplo oficial 12.ABC.345/01DE-35', () => {
    const resultado = validarCnpj('12.ABC.345/01DE-35');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.alfanumerico).toBe(true);
  });

  it('reproduz as somas do exemplo oficial', () => {
    const resultado = validarCnpj('12ABC34501DE35');
    const [primeiro, segundo] = resultado.passos;

    expect(primeiro?.soma).toBe(459);
    expect(primeiro?.resto).toBe(8);
    expect(primeiro?.esperado).toBe(3);
    expect(segundo?.soma).toBe(424);
    expect(segundo?.resto).toBe(6);
    expect(segundo?.esperado).toBe(5);
  });

  it('trata letra minúscula como maiúscula', () => {
    expect(validarCnpj('12abc34501de35').ok).toBe(true);
  });

  it('recusa dígito verificador com letra', () => {
    const resultado = validarCnpj('12ABC34501DEA5');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('dv-com-letra');
  });

  it('recusa quando o dígito não bate', () => {
    const resultado = validarCnpj('12ABC34501DE36');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('digito-nao-confere');
  });

  it('recusa sequência repetida', () => {
    const resultado = validarCnpj('11111111111111');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('repetido');
  });

  it('recusa tamanho errado', () => {
    const resultado = validarCnpj('11222333000');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('tamanho');
  });

  it('guarda os caracteres de origem para a exibição do cálculo', () => {
    const resultado = validarCnpj('12ABC34501DE35');

    expect(resultado.passos[0]?.caracteres?.slice(2, 5)).toEqual(['A', 'B', 'C']);
    expect(resultado.passos[0]?.digitos.slice(2, 5)).toEqual([17, 18, 19]);
  });
});

describe('gerarCnpj', () => {
  it('gera CNPJs numéricos válidos', () => {
    for (let i = 0; i < 200; i += 1) {
      const { cru } = gerarCnpj();

      expect(cru).toMatch(/^\d{14}$/);
      expect(validarCnpj(cru).ok).toBe(true);
    }
  });

  it('gera CNPJs alfanuméricos válidos com DV numérico', () => {
    for (let i = 0; i < 200; i += 1) {
      const { cru } = gerarCnpj(true);

      expect(cru).toMatch(/^[0-9A-Z]{12}\d{2}$/);
      expect(validarCnpj(cru).ok).toBe(true);
    }
  });

  it('formata na máscara esperada', () => {
    const { cru, formatado } = gerarCnpj(true);

    expect(formatado).toBe(formatarCnpj(cru));
    expect(formatado).toMatch(/^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}$/);
  });
});
