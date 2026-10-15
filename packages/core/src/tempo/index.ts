/**
 * Conversão de timestamp e soma de horas trabalhadas.
 *
 * Tudo em minutos inteiros: somar horário com ponto flutuante acumula erro, e
 * um banco de horas que fecha em 7,999 horas é pior que inútil.
 */

export type MotivoTimestampInvalido = 'vazio' | 'nao-reconhecido';

export type InstanteConvertido = {
  epochSegundos: number;
  epochMilissegundos: number;
  iso: string;
  /** Interpretação adotada, para a interface mostrar o que foi assumido. */
  origem: 'segundos' | 'milissegundos' | 'texto';
};

export type ResultadoTimestamp =
  | { ok: true; instante: InstanteConvertido }
  | { ok: false; motivo: MotivoTimestampInvalido };

export const MENSAGEM_TIMESTAMP: Record<MotivoTimestampInvalido, string> = {
  vazio: 'Informe um timestamp ou uma data.',
  'nao-reconhecido': 'Não reconheci isso como data. Tente um número epoch ou algo como 2026-10-10.',
};

/**
 * Epoch em segundos e em milissegundos se distinguem pela ordem de grandeza.
 * O corte em 10^11 separa o ano 5138 em segundos de 1973 em milissegundos —
 * uma ambiguidade que nenhum dos dois lados alcança na prática.
 */
function interpretarNumero(valor: number): InstanteConvertido {
  const milissegundos = Math.abs(valor) >= 1e11 ? valor : valor * 1000;

  return {
    epochSegundos: Math.floor(milissegundos / 1000),
    epochMilissegundos: milissegundos,
    iso: new Date(milissegundos).toISOString(),
    origem: Math.abs(valor) >= 1e11 ? 'milissegundos' : 'segundos',
  };
}

export function converterTimestamp(entrada: string): ResultadoTimestamp {
  const texto = entrada.trim();

  if (texto === '') return { ok: false, motivo: 'vazio' };

  if (/^-?\d+$/.test(texto)) {
    const valor = Number(texto);

    if (!Number.isFinite(valor)) return { ok: false, motivo: 'nao-reconhecido' };

    const instante = interpretarNumero(valor);

    if (Number.isNaN(new Date(instante.epochMilissegundos).getTime())) {
      return { ok: false, motivo: 'nao-reconhecido' };
    }

    return { ok: true, instante };
  }

  const data = new Date(texto);

  if (Number.isNaN(data.getTime())) return { ok: false, motivo: 'nao-reconhecido' };

  return {
    ok: true,
    instante: {
      epochSegundos: Math.floor(data.getTime() / 1000),
      epochMilissegundos: data.getTime(),
      iso: data.toISOString(),
      origem: 'texto',
    },
  };
}

export const AGORA_EM_SEGUNDOS = (): number => Math.floor(Date.now() / 1000);

/* ---------------------------------------------------------------- horas --- */

export type Marcacao = {
  /** "08:00" */
  entrada: string;
  /** "12:00" */
  saida: string;
};

export type MotivoHoraInvalida = 'formato' | 'saida-antes-da-entrada';

export type LinhaCalculada = {
  minutos: number;
  erro?: MotivoHoraInvalida;
};

export type ResumoJornada = {
  linhas: LinhaCalculada[];
  /** Soma das linhas válidas, em minutos. */
  totalMinutos: number;
  /** Diferença para a jornada esperada. Negativo significa devendo. */
  saldoMinutos: number;
  /** true quando alguma linha tem erro. */
  temErro: boolean;
};

export const MENSAGEM_HORA: Record<MotivoHoraInvalida, string> = {
  formato: 'Use o formato HH:MM, como 08:30.',
  'saida-antes-da-entrada': 'A saída está antes da entrada nesta linha.',
};

/** Converte "08:30" em 510. Devolve null quando o formato não bate. */
export function paraMinutos(hora: string): number | null {
  const casa = hora.trim().match(/^(\d{1,2}):?(\d{2})$/);

  if (!casa) return null;

  const horas = Number(casa[1]);
  const minutos = Number(casa[2]);

  if (horas > 23 || minutos > 59) return null;

  return horas * 60 + minutos;
}

/** Converte 510 em "08:30". Negativos saem com sinal: "-01:15". */
export function paraHora(minutos: number): string {
  const sinal = minutos < 0 ? '-' : '';
  const absoluto = Math.abs(minutos);

  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, '0')}:${String(absoluto % 60).padStart(2, '0')}`;
}

export function calcularJornada(marcacoes: Marcacao[], jornadaMinutos = 480): ResumoJornada {
  const linhas: LinhaCalculada[] = marcacoes.map(({ entrada, saida }) => {
    const inicio = paraMinutos(entrada);
    const fim = paraMinutos(saida);

    if (inicio === null || fim === null) return { minutos: 0, erro: 'formato' };

    // Turno que cruza a meia-noite: sem este ajuste, 22:00 às 06:00 daria
    // dezesseis horas negativas.
    const duracao = fim >= inicio ? fim - inicio : fim + 24 * 60 - inicio;

    if (duracao > 16 * 60) return { minutos: 0, erro: 'saida-antes-da-entrada' };

    return { minutos: duracao };
  });

  const totalMinutos = linhas.reduce((total, linha) => total + (linha.erro ? 0 : linha.minutos), 0);

  return {
    linhas,
    totalMinutos,
    saldoMinutos: totalMinutos - jornadaMinutos,
    temErro: linhas.some((linha) => linha.erro !== undefined),
  };
}
