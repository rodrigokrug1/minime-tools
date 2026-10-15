import { calcularPasso, limpar, type PassoDv, sortear } from './dv.js';

const PESOS_DV1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export type MotivoCpfInvalido =
  | 'vazio'
  | 'tamanho'
  | 'caracteres'
  | 'repetido'
  | 'digito-nao-confere';

export type ResultadoCpf =
  | { ok: true; formatado: string; passos: PassoDv[] }
  | { ok: false; motivo: MotivoCpfInvalido; passos: PassoDv[] };

export const MENSAGEM_CPF: Record<MotivoCpfInvalido, string> = {
  vazio: 'Digite um CPF para verificar.',
  tamanho: 'Um CPF tem 11 dígitos. Confira se não falta ou sobra algum.',
  caracteres: 'CPF só tem números. Pontos e traço podem ficar, letras não.',
  repetido: 'Sequências de um dígito só, como 111.111.111-11, passam na conta mas não são válidas.',
  'digito-nao-confere': 'Os dígitos verificadores não batem com o restante do número.',
};

export function formatarCpf(cpf: string): string {
  const limpo = limpar(cpf);

  if (limpo.length !== 11) return cpf;

  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
}

/** Calcula os dois passos do DV a partir dos nove primeiros dígitos. */
function passos(base: number[], informados?: [number, number]): PassoDv[] {
  const primeiro = calcularPasso(
    '1º dígito verificador',
    base,
    PESOS_DV1,
    informados ? { informado: informados[0] } : {},
  );

  const segundo = calcularPasso(
    '2º dígito verificador',
    [...base, primeiro.esperado],
    PESOS_DV2,
    informados ? { informado: informados[1] } : {},
  );

  return [primeiro, segundo];
}

export function validarCpf(entrada: string): ResultadoCpf {
  const bruto = entrada.trim();

  if (bruto === '') return { ok: false, motivo: 'vazio', passos: [] };

  const limpo = limpar(bruto);

  if (/[A-Z]/.test(limpo)) return { ok: false, motivo: 'caracteres', passos: [] };
  if (limpo.length !== 11) return { ok: false, motivo: 'tamanho', passos: [] };

  // 000.000.000-00 e companhia satisfazem o módulo 11, mas a Receita não as
  // emite. Sem esta checagem, a ferramenta aprovaria um número inexistente.
  if (/^(\d)\1{10}$/.test(limpo)) return { ok: false, motivo: 'repetido', passos: [] };

  const digitos = [...limpo].map(Number);
  const base = digitos.slice(0, 9);
  const informados: [number, number] = [digitos[9] as number, digitos[10] as number];

  const calculados = passos(base, informados);
  const confere = calculados.every((passo) => passo.esperado === passo.informado);

  return confere
    ? { ok: true, formatado: formatarCpf(limpo), passos: calculados }
    : { ok: false, motivo: 'digito-nao-confere', passos: calculados };
}

export function gerarCpf(): { formatado: string; cru: string; passos: PassoDv[] } {
  let base: number[];

  // Um sorteio pode cair em 999999999; refaz até sair uma base que não seja
  // toda igual, já que ela produziria um CPF recusado por `validarCpf`.
  do {
    base = Array.from({ length: 9 }, () => sortear(10));
  } while (base.every((digito) => digito === base[0]));

  const calculados = passos(base);
  const cru = [...base, calculados[0]?.esperado ?? 0, calculados[1]?.esperado ?? 0].join('');

  return { formatado: formatarCpf(cru), cru, passos: calculados };
}
