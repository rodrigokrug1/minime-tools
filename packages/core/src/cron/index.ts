/**
 * Interpretação de expressões cron de cinco campos.
 *
 * Faz três coisas: valida, descreve em português e calcula as próximas
 * execuções. A terceira é a que realmente tira a dúvida — ler "0 0 1 * 1" e
 * imaginar quando dispara é mais difícil do que parece, e o resultado
 * costuma surpreender (veja a regra de OU entre dia do mês e dia da semana).
 *
 * Os horários são calculados no fuso local de quem está usando, que é o que a
 * pessoa quer conferir. O servidor onde o cron roda pode estar em outro fuso,
 * e isso é dito na interface.
 */

export type CampoCron = 'minuto' | 'hora' | 'diaDoMes' | 'mes' | 'diaDaSemana';

export type MotivoCronInvalido =
  | 'vazia'
  | 'numero-de-campos'
  | 'campo-invalido'
  | 'fora-do-intervalo'
  | 'intervalo-invertido'
  | 'passo-invalido'
  | 'nunca-dispara';

export type ErroCron = {
  motivo: MotivoCronInvalido;
  /** Campo onde o problema está, quando aplicável. */
  campo?: CampoCron;
  /** Trecho exato que causou o problema. */
  trecho?: string;
};

export type ExpressaoCron = {
  minutos: number[];
  horas: number[];
  diasDoMes: number[];
  meses: number[];
  diasDaSemana: number[];
  /** true quando o campo é `*`, o que muda a regra de OU entre dia e semana. */
  diaDoMesRestrito: boolean;
  diaDaSemanaRestrito: boolean;
};

export type ResultadoCron =
  | { ok: true; expressao: ExpressaoCron; descricao: string; normalizada: string }
  | { ok: false; erro: ErroCron };

export const MENSAGEM_CRON: Record<MotivoCronInvalido, string> = {
  vazia: 'Digite uma expressão cron.',
  'numero-de-campos':
    'Uma expressão cron tem cinco campos: minuto, hora, dia do mês, mês e dia da semana.',
  'campo-invalido': 'Este campo não está em um formato que o cron entenda.',
  'fora-do-intervalo': 'Há um valor fora do intervalo aceito por este campo.',
  'intervalo-invertido': 'O início de um intervalo está depois do fim.',
  'passo-invalido': 'O passo depois da barra precisa ser um número maior que zero.',
  'nunca-dispara': 'Esta combinação de dia e mês nunca acontece no calendário.',
};

const LIMITES: Record<CampoCron, { min: number; max: number }> = {
  minuto: { min: 0, max: 59 },
  hora: { min: 0, max: 23 },
  diaDoMes: { min: 1, max: 31 },
  mes: { min: 1, max: 12 },
  // 0 e 7 representam domingo; o 7 é normalizado para 0 na leitura.
  diaDaSemana: { min: 0, max: 7 },
};

const NOMES_MES: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  APR: 4,
  MAI: 5,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  AUG: 8,
  SET: 9,
  SEP: 9,
  OUT: 10,
  OCT: 10,
  NOV: 11,
  DEZ: 12,
  DEC: 12,
};

const NOMES_SEMANA: Record<string, number> = {
  DOM: 0,
  SUN: 0,
  SEG: 1,
  MON: 1,
  TER: 2,
  TUE: 2,
  QUA: 3,
  WED: 3,
  QUI: 4,
  THU: 4,
  SEX: 5,
  FRI: 5,
  SAB: 6,
  SAT: 6,
};

export const MES_POR_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const SEMANA_POR_EXTENSO = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** Atalhos que o cron aceita no lugar dos cinco campos. */
const ATALHOS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

function traduzirNome(texto: string, campo: CampoCron): string {
  const maiusculo = texto.toUpperCase();

  if (campo === 'mes' && maiusculo in NOMES_MES) return String(NOMES_MES[maiusculo]);
  if (campo === 'diaDaSemana' && maiusculo in NOMES_SEMANA) return String(NOMES_SEMANA[maiusculo]);

  return texto;
}

/** Expande um campo em todos os valores que ele permite, já ordenados. */
function lerCampo(bruto: string, campo: CampoCron): number[] | ErroCron {
  const { min, max } = LIMITES[campo];
  const valores = new Set<number>();

  for (const parte of bruto.split(',')) {
    if (parte === '') return { motivo: 'campo-invalido', campo, trecho: bruto };

    const [intervalo, passoBruto, ...sobra] = parte.split('/');

    if (sobra.length > 0 || intervalo === undefined) {
      return { motivo: 'campo-invalido', campo, trecho: parte };
    }

    let passo = 1;

    if (passoBruto !== undefined) {
      if (!/^\d+$/.test(passoBruto) || Number(passoBruto) === 0) {
        return { motivo: 'passo-invalido', campo, trecho: parte };
      }
      passo = Number(passoBruto);
    }

    let inicio: number;
    let fim: number;

    if (intervalo === '*') {
      inicio = min;
      fim = max;
    } else {
      const extremos = intervalo.split('-').map((item) => traduzirNome(item, campo));

      if (extremos.length > 2) return { motivo: 'campo-invalido', campo, trecho: parte };
      if (extremos.some((item) => !/^\d+$/.test(item))) {
        return { motivo: 'campo-invalido', campo, trecho: parte };
      }

      inicio = Number(extremos[0]);
      // "5/10" significa de 5 até o máximo, de 10 em 10.
      fim = extremos.length === 2 ? Number(extremos[1]) : passoBruto !== undefined ? max : inicio;
    }

    if (inicio < min || fim > max) return { motivo: 'fora-do-intervalo', campo, trecho: parte };
    if (inicio > fim) return { motivo: 'intervalo-invertido', campo, trecho: parte };

    for (let valor = inicio; valor <= fim; valor += passo) {
      // Domingo aceita 0 e 7; guardamos sempre como 0.
      valores.add(campo === 'diaDaSemana' && valor === 7 ? 0 : valor);
    }
  }

  return [...valores].sort((a, b) => a - b);
}

function ehErro(valor: number[] | ErroCron): valor is ErroCron {
  return !Array.isArray(valor);
}

/** Lista "1, 2 e 5" em vez de "1, 2, 5". */
function enumerar(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;

  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}

function descreverHorario(minutos: number[], horas: number[], bruto: string[]): string {
  const [minBruto, horaBruto] = bruto;
  const todosMinutos = minBruto === '*';
  const todasHoras = horaBruto === '*';

  if (todosMinutos && todasHoras) return 'a cada minuto';

  if (todosMinutos) {
    return `a cada minuto das ${enumerar(horas.map((h) => `${String(h).padStart(2, '0')}h`))}`;
  }

  const passoMinuto = minBruto?.match(/^\*\/(\d+)$/);

  if (passoMinuto && todasHoras) return `a cada ${passoMinuto[1]} minutos`;
  if (passoMinuto) {
    return `a cada ${passoMinuto[1]} minutos das ${enumerar(horas.map((h) => `${String(h).padStart(2, '0')}h`))}`;
  }

  if (todasHoras) {
    return `no minuto ${enumerar(minutos.map(String))} de toda hora`;
  }

  const momentos = horas.flatMap((h) =>
    minutos.map((m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
  );

  return momentos.length <= 6
    ? `às ${enumerar(momentos)}`
    : `em ${momentos.length} horários ao longo do dia`;
}

function descreverDias(expressao: ExpressaoCron, bruto: string[]): string {
  const [, , diaBruto, mesBruto] = bruto;

  const partes: string[] = [];

  if (expressao.diaDoMesRestrito) {
    const passo = diaBruto?.match(/^\*\/(\d+)$/);

    partes.push(
      passo
        ? `a cada ${passo[1]} dias do mês`
        : `nos dias ${enumerar(expressao.diasDoMes.map(String))}`,
    );
  }

  if (expressao.diaDaSemanaRestrito) {
    partes.push(
      `${expressao.diasDaSemana.length === 1 ? 'toda' : 'todas as'} ${enumerar(
        expressao.diasDaSemana.map((d) => SEMANA_POR_EXTENSO[d] ?? String(d)),
      )}`,
    );
  }

  // A regra que mais confunde: com os dois campos restritos, o cron dispara
  // quando QUALQUER UM bate, não os dois juntos.
  const diasTexto =
    partes.length === 2
      ? `${partes[0]} ou ${partes[1]} (basta um dos dois)`
      : (partes[0] ?? 'todos os dias');

  if (mesBruto === '*') return diasTexto;

  const meses = enumerar(expressao.meses.map((m) => MES_POR_EXTENSO[m - 1] ?? String(m)));

  return `${diasTexto}, em ${meses}`;
}

export function interpretarCron(entrada: string): ResultadoCron {
  const texto = entrada.trim().replace(/\s+/g, ' ');

  if (texto === '') return { ok: false, erro: { motivo: 'vazia' } };

  const expandido = ATALHOS[texto.toLowerCase()] ?? texto;
  const campos = expandido.split(' ');

  if (campos.length !== 5) return { ok: false, erro: { motivo: 'numero-de-campos' } };

  const nomes: CampoCron[] = ['minuto', 'hora', 'diaDoMes', 'mes', 'diaDaSemana'];
  const lidos: number[][] = [];

  for (let i = 0; i < 5; i += 1) {
    const resultado = lerCampo(campos[i] as string, nomes[i] as CampoCron);

    if (ehErro(resultado)) return { ok: false, erro: resultado };

    lidos.push(resultado);
  }

  const expressao: ExpressaoCron = {
    minutos: lidos[0] as number[],
    horas: lidos[1] as number[],
    diasDoMes: lidos[2] as number[],
    meses: lidos[3] as number[],
    diasDaSemana: lidos[4] as number[],
    diaDoMesRestrito: campos[2] !== '*',
    diaDaSemanaRestrito: campos[4] !== '*',
  };

  const descricao = `${descreverHorario(expressao.minutos, expressao.horas, campos)}, ${descreverDias(expressao, campos)}`;

  return {
    ok: true,
    expressao,
    descricao: descricao.charAt(0).toUpperCase() + descricao.slice(1),
    normalizada: expandido,
  };
}

/** O dia bate? Com os dois campos restritos vale OU, como manda o cron. */
function diaCombina(data: Date, expressao: ExpressaoCron): boolean {
  const porDia = expressao.diasDoMes.includes(data.getDate());
  const porSemana = expressao.diasDaSemana.includes(data.getDay());

  if (expressao.diaDoMesRestrito && expressao.diaDaSemanaRestrito) return porDia || porSemana;
  if (expressao.diaDoMesRestrito) return porDia;
  if (expressao.diaDaSemanaRestrito) return porSemana;

  return true;
}

/**
 * Próximas execuções, no fuso local.
 *
 * Avança pela maior unidade que não bate — mês, depois dia, hora e minuto —
 * em vez de testar minuto a minuto. Sem isso, uma expressão como
 * "0 0 29 2 *" levaria milhões de iterações até achar o próximo 29 de
 * fevereiro.
 */
export function proximasExecucoes(
  expressao: ExpressaoCron,
  quantidade = 5,
  de: Date = new Date(),
): Date[] {
  const encontradas: Date[] = [];

  const cursor = new Date(de.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Teto de segurança: oito anos cobrem até 29 de fevereiro em qualquer
  // ponto de partida, e impede laço infinito numa data impossível.
  const limite = new Date(cursor.getTime());
  limite.setFullYear(limite.getFullYear() + 8);

  while (encontradas.length < quantidade && cursor < limite) {
    if (!expressao.meses.includes(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (!diaCombina(cursor, expressao)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (!expressao.horas.includes(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!expressao.minutos.includes(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
      continue;
    }

    encontradas.push(new Date(cursor.getTime()));
    cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
  }

  return encontradas;
}

/** Expressões comuns, para a pessoa partir de algo em vez da folha em branco. */
export const EXEMPLOS_CRON: Array<{ expressao: string; para: string }> = [
  { expressao: '*/5 * * * *', para: 'a cada cinco minutos' },
  { expressao: '0 * * * *', para: 'de hora em hora, no minuto zero' },
  { expressao: '0 3 * * *', para: 'todo dia às três da manhã' },
  { expressao: '30 8 * * 1-5', para: 'dias úteis às 8h30' },
  { expressao: '0 0 1 * *', para: 'no primeiro dia de cada mês' },
  { expressao: '0 22 * * 5', para: 'toda sexta às dez da noite' },
  { expressao: '0 0 1 1 *', para: 'uma vez por ano, no dia 1º de janeiro' },
];
