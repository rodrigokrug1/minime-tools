import { describe, expect, it } from 'vitest';
import { interpretarCron, proximasExecucoes } from './index.js';

/** Atalho: interpreta e devolve a expressão, falhando o teste se não for válida. */
function expressaoDe(texto: string) {
  const resultado = interpretarCron(texto);

  if (!resultado.ok) throw new Error(`esperava expressão válida: ${texto}`);

  return resultado.expressao;
}

/** Formata no fuso local, que é onde proximasExecucoes trabalha. */
function local(data: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');

  return `${data.getFullYear()}-${d(data.getMonth() + 1)}-${d(data.getDate())} ${d(data.getHours())}:${d(data.getMinutes())}`;
}

describe('interpretarCron — validação', () => {
  it('aceita a expressão de cinco campos mais simples', () => {
    expect(interpretarCron('* * * * *').ok).toBe(true);
  });

  it('normaliza espaços repetidos', () => {
    const resultado = interpretarCron('0   3  *  *  *');

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.normalizada).toBe('0 3 * * *');
  });

  it.each([
    ['@daily', '0 0 * * *'],
    ['@hourly', '0 * * * *'],
    ['@weekly', '0 0 * * 0'],
    ['@monthly', '0 0 1 * *'],
    ['@yearly', '0 0 1 1 *'],
  ])('expande o atalho %s', (atalho, esperado) => {
    const resultado = interpretarCron(atalho);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.normalizada).toBe(esperado);
  });

  it('recusa entrada vazia', () => {
    const resultado = interpretarCron('   ');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.motivo).toBe('vazia');
  });

  it.each(['* * * *', '* * * * * *'])('recusa %s por número de campos', (texto) => {
    const resultado = interpretarCron(texto);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.motivo).toBe('numero-de-campos');
  });

  it('recusa minuto acima de 59', () => {
    const resultado = interpretarCron('60 * * * *');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro.motivo).toBe('fora-do-intervalo');
      expect(resultado.erro.campo).toBe('minuto');
    }
  });

  it('recusa hora acima de 23', () => {
    const resultado = interpretarCron('0 24 * * *');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.campo).toBe('hora');
  });

  it('recusa intervalo invertido', () => {
    const resultado = interpretarCron('0 10-5 * * *');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.motivo).toBe('intervalo-invertido');
  });

  it('recusa passo zero', () => {
    const resultado = interpretarCron('*/0 * * * *');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.motivo).toBe('passo-invalido');
  });

  it('recusa texto que não é número nem nome conhecido', () => {
    const resultado = interpretarCron('abc * * * *');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.motivo).toBe('campo-invalido');
  });
});

describe('interpretarCron — expansão dos campos', () => {
  it('expande passo', () => {
    expect(expressaoDe('*/15 * * * *').minutos).toEqual([0, 15, 30, 45]);
  });

  it('expande intervalo', () => {
    expect(expressaoDe('0 9-12 * * *').horas).toEqual([9, 10, 11, 12]);
  });

  it('expande lista', () => {
    expect(expressaoDe('0 0 1,15,28 * *').diasDoMes).toEqual([1, 15, 28]);
  });

  it('expande intervalo com passo', () => {
    expect(expressaoDe('0 0-20/5 * * *').horas).toEqual([0, 5, 10, 15, 20]);
  });

  it('trata "5/10" como de 5 até o máximo', () => {
    expect(expressaoDe('5/10 * * * *').minutos).toEqual([5, 15, 25, 35, 45, 55]);
  });

  it('aceita nome de mês em português e inglês', () => {
    expect(expressaoDe('0 0 1 JAN,DEZ *').meses).toEqual([1, 12]);
    expect(expressaoDe('0 0 1 jan,dec *').meses).toEqual([1, 12]);
  });

  it('aceita nome de dia da semana', () => {
    expect(expressaoDe('0 0 * * SEG-SEX').diasDaSemana).toEqual([1, 2, 3, 4, 5]);
  });

  it('normaliza 7 como domingo', () => {
    expect(expressaoDe('0 0 * * 7').diasDaSemana).toEqual([0]);
    expect(expressaoDe('0 0 * * 0,7').diasDaSemana).toEqual([0]);
  });

  it('remove duplicados de uma lista', () => {
    expect(expressaoDe('1,1,2 * * * *').minutos).toEqual([1, 2]);
  });

  it('marca quais campos de dia estão restritos', () => {
    const livre = expressaoDe('0 0 * * *');
    const ambos = expressaoDe('0 0 1 * 1');

    expect(livre.diaDoMesRestrito).toBe(false);
    expect(livre.diaDaSemanaRestrito).toBe(false);
    expect(ambos.diaDoMesRestrito).toBe(true);
    expect(ambos.diaDaSemanaRestrito).toBe(true);
  });
});

describe('interpretarCron — descrição', () => {
  it('descreve a cada minuto', () => {
    const resultado = interpretarCron('* * * * *');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('cada minuto');
  });

  it('descreve passo de minutos', () => {
    const resultado = interpretarCron('*/5 * * * *');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('cada 5 minutos');
  });

  it('descreve horário fixo', () => {
    const resultado = interpretarCron('30 8 * * *');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('08:30');
  });

  it('descreve dias da semana por extenso', () => {
    const resultado = interpretarCron('0 22 * * 5');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('sexta-feira');
  });

  it('avisa sobre o OU quando dia do mês e dia da semana estão restritos', () => {
    const resultado = interpretarCron('0 0 1 * 1');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('basta um dos dois');
  });

  it('inclui o mês quando restrito', () => {
    const resultado = interpretarCron('0 0 1 1 *');

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.descricao).toContain('janeiro');
  });
});

describe('proximasExecucoes', () => {
  // Quarta-feira, 10 de junho de 2026, 10:30 no fuso local.
  const base = new Date(2026, 5, 10, 10, 30, 0, 0);

  it('calcula os próximos minutos cheios', () => {
    const datas = proximasExecucoes(expressaoDe('0 * * * *'), 3, base);

    expect(datas.map(local)).toEqual(['2026-06-10 11:00', '2026-06-10 12:00', '2026-06-10 13:00']);
  });

  it('nunca devolve o próprio instante de partida', () => {
    const emPonto = new Date(2026, 5, 10, 11, 0, 0, 0);
    const datas = proximasExecucoes(expressaoDe('0 * * * *'), 1, emPonto);

    expect(local(datas[0] as Date)).toBe('2026-06-10 12:00');
  });

  it('calcula horário diário', () => {
    const datas = proximasExecucoes(expressaoDe('0 3 * * *'), 2, base);

    expect(datas.map(local)).toEqual(['2026-06-11 03:00', '2026-06-12 03:00']);
  });

  it('calcula dias úteis', () => {
    const datas = proximasExecucoes(expressaoDe('30 8 * * 1-5'), 4, base);

    // Quinta, sexta, pula o fim de semana, segunda e terça.
    expect(datas.map(local)).toEqual([
      '2026-06-11 08:30',
      '2026-06-12 08:30',
      '2026-06-15 08:30',
      '2026-06-16 08:30',
    ]);
  });

  it('calcula primeiro dia do mês', () => {
    const datas = proximasExecucoes(expressaoDe('0 0 1 * *'), 2, base);

    expect(datas.map(local)).toEqual(['2026-07-01 00:00', '2026-08-01 00:00']);
  });

  it('aplica OU entre dia do mês e dia da semana', () => {
    // Dia 15 OU toda segunda-feira. Junho de 2026: segundas em 15, 22, 29.
    // O dia 15 é segunda, então aparece uma vez só.
    const datas = proximasExecucoes(expressaoDe('0 0 15 * 1'), 4, base);

    expect(datas.map(local)).toEqual([
      '2026-06-15 00:00',
      '2026-06-22 00:00',
      '2026-06-29 00:00',
      '2026-07-06 00:00',
    ]);
  });

  it('atravessa anos para achar 29 de fevereiro sem travar', () => {
    const datas = proximasExecucoes(expressaoDe('0 12 29 2 *'), 2, base);

    expect(datas.map(local)).toEqual(['2028-02-29 12:00', '2032-02-29 12:00']);
  });

  it('devolve lista vazia quando a data nunca acontece', () => {
    // 30 de fevereiro não existe em calendário nenhum.
    expect(proximasExecucoes(expressaoDe('0 0 30 2 *'), 3, base)).toEqual([]);
  });

  it('respeita a quantidade pedida', () => {
    expect(proximasExecucoes(expressaoDe('* * * * *'), 10, base)).toHaveLength(10);
  });

  it('calcula a cada cinco minutos sem pular nenhum', () => {
    const datas = proximasExecucoes(expressaoDe('*/5 * * * *'), 3, base);

    expect(datas.map(local)).toEqual(['2026-06-10 10:35', '2026-06-10 10:40', '2026-06-10 10:45']);
  });
});
