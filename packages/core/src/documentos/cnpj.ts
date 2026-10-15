import { calcularPasso, limpar, type PassoDv, sortear, valorDoCaractere } from './dv.js';

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type MotivoCnpjInvalido =
  | 'vazio'
  | 'tamanho'
  | 'caracteres'
  | 'dv-com-letra'
  | 'repetido'
  | 'digito-nao-confere';

export type ResultadoCnpj =
  | { ok: true; formatado: string; alfanumerico: boolean; passos: PassoDv[] }
  | { ok: false; motivo: MotivoCnpjInvalido; passos: PassoDv[] };

export const MENSAGEM_CNPJ: Record<MotivoCnpjInvalido, string> = {
  vazio: 'Digite um CNPJ para verificar.',
  tamanho: 'Um CNPJ tem 14 caracteres. Confira se não falta ou sobra algum.',
  caracteres: 'O CNPJ aceita números e letras de A a Z. Outros símbolos não entram na conta.',
  'dv-com-letra': 'Os dois últimos caracteres são sempre numéricos, mesmo no CNPJ alfanumérico.',
  repetido: 'Sequências de um caractere só passam na conta, mas não são CNPJs emitidos.',
  'digito-nao-confere': 'Os dígitos verificadores não batem com o restante do número.',
};

export function formatarCnpj(cnpj: string): string {
  const limpo = limpar(cnpj);

  if (limpo.length !== 14) return cnpj;

  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}

/**
 * Monta os dois passos do DV.
 *
 * Cada caractere entra na conta pelo código ASCII menos 48 — regra que faz
 * dígitos valerem 0 a 9 e letras valerem 17 a 42. Para um CNPJ só numérico o
 * resultado é idêntico ao cálculo clássico, então uma implementação só atende
 * os dois formatos.
 */
function passos(base: string, informados?: [number, number]): PassoDv[] {
  const caracteres = [...base];
  const valores = caracteres.map(valorDoCaractere);

  const primeiro = calcularPasso('1º dígito verificador', valores, PESOS_DV1, {
    caracteres,
    ...(informados ? { informado: informados[0] } : {}),
  });

  const caracteresSegundo = [...caracteres, String(primeiro.esperado)];

  const segundo = calcularPasso(
    '2º dígito verificador',
    caracteresSegundo.map(valorDoCaractere),
    PESOS_DV2,
    {
      caracteres: caracteresSegundo,
      ...(informados ? { informado: informados[1] } : {}),
    },
  );

  return [primeiro, segundo];
}

export function validarCnpj(entrada: string): ResultadoCnpj {
  const bruto = entrada.trim();

  if (bruto === '') return { ok: false, motivo: 'vazio', passos: [] };

  const limpo = limpar(bruto);

  if (limpo.length !== 14) return { ok: false, motivo: 'tamanho', passos: [] };
  if (!/^[0-9A-Z]{14}$/.test(limpo)) return { ok: false, motivo: 'caracteres', passos: [] };

  // Os doze primeiros podem ser alfanuméricos; os dois dígitos verificadores
  // continuam sempre numéricos.
  if (!/^\d{2}$/.test(limpo.slice(12))) return { ok: false, motivo: 'dv-com-letra', passos: [] };
  if (/^(.)\1{13}$/.test(limpo)) return { ok: false, motivo: 'repetido', passos: [] };

  const base = limpo.slice(0, 12);
  const informados: [number, number] = [Number(limpo[12]), Number(limpo[13])];

  const calculados = passos(base, informados);
  const confere = calculados.every((passo) => passo.esperado === passo.informado);

  return confere
    ? {
        ok: true,
        formatado: formatarCnpj(limpo),
        alfanumerico: /[A-Z]/.test(base),
        passos: calculados,
      }
    : { ok: false, motivo: 'digito-nao-confere', passos: calculados };
}

export function gerarCnpj(alfanumerico = false): {
  formatado: string;
  cru: string;
  passos: PassoDv[];
} {
  const fonte = alfanumerico ? ALFABETO : '0123456789';

  let base: string;

  do {
    base = Array.from({ length: 12 }, () => fonte[sortear(fonte.length)]).join('');
  } while ([...base].every((caractere) => caractere === base[0]));

  const calculados = passos(base);
  const cru = `${base}${calculados[0]?.esperado ?? 0}${calculados[1]?.esperado ?? 0}`;

  return { formatado: formatarCnpj(cru), cru, passos: calculados };
}
