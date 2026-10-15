import { describe, expect, it } from 'vitest';
import { calcularJornada, converterTimestamp, paraHora, paraMinutos } from './index.js';

describe('converterTimestamp', () => {
  it('interpreta número pequeno como segundos', () => {
    const resultado = converterTimestamp('1700000000');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.instante.origem).toBe('segundos');
    expect(resultado.instante.iso).toBe('2023-11-14T22:13:20.000Z');
  });

  it('interpreta número grande como milissegundos', () => {
    const resultado = converterTimestamp('1700000000000');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.instante.origem).toBe('milissegundos');
    expect(resultado.instante.iso).toBe('2023-11-14T22:13:20.000Z');
  });

  it('aceita data em texto ISO', () => {
    const resultado = converterTimestamp('2026-10-10T12:00:00Z');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.instante.origem).toBe('texto');
    expect(resultado.instante.epochSegundos).toBe(1791633600);
  });

  it('aceita epoch negativo, anterior a 1970', () => {
    const resultado = converterTimestamp('-86400');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.instante.iso).toBe('1969-12-31T00:00:00.000Z');
  });

  it('recusa entrada vazia', () => {
    const resultado = converterTimestamp('');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('vazio');
  });

  it('recusa texto que não é data', () => {
    const resultado = converterTimestamp('banana');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('nao-reconhecido');
  });
});

describe('paraMinutos e paraHora', () => {
  it('converte ida e volta', () => {
    expect(paraMinutos('08:30')).toBe(510);
    expect(paraHora(510)).toBe('08:30');
  });

  it('aceita sem dois pontos', () => {
    expect(paraMinutos('0830')).toBe(510);
  });

  it('formata negativo com sinal', () => {
    expect(paraHora(-75)).toBe('-01:15');
  });

  it.each(['25:00', '08:70', 'abc', '8'])('recusa %s', (entrada) => {
    expect(paraMinutos(entrada)).toBeNull();
  });
});

describe('calcularJornada', () => {
  it('soma um dia comum com intervalo de almoço', () => {
    const resumo = calcularJornada([
      { entrada: '08:00', saida: '12:00' },
      { entrada: '13:00', saida: '17:00' },
    ]);

    expect(resumo.totalMinutos).toBe(480);
    expect(resumo.saldoMinutos).toBe(0);
    expect(resumo.temErro).toBe(false);
  });

  it('acusa saldo positivo nas horas extras', () => {
    const resumo = calcularJornada([{ entrada: '08:00', saida: '18:30' }]);

    expect(paraHora(resumo.totalMinutos)).toBe('10:30');
    expect(paraHora(resumo.saldoMinutos)).toBe('02:30');
  });

  it('acusa saldo negativo quando falta jornada', () => {
    const resumo = calcularJornada([{ entrada: '09:00', saida: '15:00' }]);

    expect(paraHora(resumo.saldoMinutos)).toBe('-02:00');
  });

  it('trata turno que cruza a meia-noite', () => {
    const resumo = calcularJornada([{ entrada: '22:00', saida: '06:00' }]);

    expect(resumo.totalMinutos).toBe(480);
    expect(resumo.temErro).toBe(false);
  });

  it('marca erro de formato sem derrubar o total das outras linhas', () => {
    const resumo = calcularJornada([
      { entrada: '08:00', saida: '12:00' },
      { entrada: 'xx', saida: '17:00' },
    ]);

    expect(resumo.linhas[1]?.erro).toBe('formato');
    expect(resumo.totalMinutos).toBe(240);
    expect(resumo.temErro).toBe(true);
  });

  it('respeita jornada esperada diferente de oito horas', () => {
    const resumo = calcularJornada([{ entrada: '08:00', saida: '14:00' }], 360);

    expect(resumo.saldoMinutos).toBe(0);
  });

  it('ignora linhas vazias como erro de formato', () => {
    const resumo = calcularJornada([{ entrada: '', saida: '' }]);

    expect(resumo.temErro).toBe(true);
    expect(resumo.totalMinutos).toBe(0);
  });
});
