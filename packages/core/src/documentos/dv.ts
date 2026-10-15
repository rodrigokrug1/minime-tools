/**
 * Maquinaria compartilhada do dígito verificador módulo 11, usada por CPF e
 * CNPJ. Cada passo carrega a conta inteira — dígitos, pesos, soma, resto — para
 * que a interface possa exibi-la em vez de só dizer "válido" ou "inválido".
 */

export type PassoDv = {
  /** Ex.: "1º dígito verificador" */
  titulo: string;
  /** Valores que entram na multiplicação. */
  digitos: number[];
  /**
   * Caracteres de origem, quando diferem do valor numérico — caso do CNPJ
   * alfanumérico, em que 'A' entra na conta como 17.
   */
  caracteres?: string[];
  pesos: number[];
  soma: number;
  modulo: number;
  resto: number;
  /** Dígito que a conta produz. */
  esperado: number;
  /** Dígito presente na entrada; ausente quando a ferramenta está gerando. */
  informado?: number;
};

/**
 * Regra do módulo 11 usada nos documentos brasileiros: resto menor que 2
 * produz dígito zero, caso contrário o dígito é 11 menos o resto.
 *
 * O material da Receita sobre o CNPJ alfanumérico só descreve o caso geral,
 * mas a convenção de resto 0 ou 1 é a mesma do CNPJ numérico.
 */
export function digitoModulo11(resto: number): number {
  return resto < 2 ? 0 : 11 - resto;
}

export function calcularPasso(
  titulo: string,
  digitos: number[],
  pesos: number[],
  opcoes: { caracteres?: string[]; informado?: number } = {},
): PassoDv {
  const soma = digitos.reduce((total, digito, indice) => total + digito * (pesos[indice] ?? 0), 0);
  const resto = soma % 11;

  return {
    titulo,
    digitos,
    pesos,
    soma,
    modulo: 11,
    resto,
    esperado: digitoModulo11(resto),
    ...(opcoes.caracteres ? { caracteres: opcoes.caracteres } : {}),
    ...(opcoes.informado !== undefined ? { informado: opcoes.informado } : {}),
  };
}

/** Remove tudo que não for alfanumérico e devolve em maiúsculas. */
export function limpar(entrada: string): string {
  return entrada.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * Valor do caractere na conta: código ASCII menos 48.
 * Dígitos 0–9 viram 0–9; letras A–Z viram 17–42.
 */
export function valorDoCaractere(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

/** Sorteia um inteiro de 0 a `limite - 1` sem viés de módulo perceptível. */
export function sortear(limite: number): number {
  const valores = new Uint32Array(1);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(valores);
    return (valores[0] ?? 0) % limite;
  }

  return Math.floor(Math.random() * limite);
}
