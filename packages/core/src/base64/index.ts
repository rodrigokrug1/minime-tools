/**
 * Codificação e decodificação em Base64 e Base64URL.
 *
 * As funções `btoa` e `atob` do navegador trabalham byte a byte e quebram com
 * qualquer caractere fora de Latin-1 — `btoa('ação')` lança exceção. Aqui o
 * texto passa por UTF-8 antes, que é o que qualquer sistema real espera.
 */

export type MotivoBase64Invalido = 'vazio' | 'caracteres' | 'tamanho' | 'utf8';

export type ResultadoBase64 =
  | { ok: true; saida: string }
  | { ok: false; motivo: MotivoBase64Invalido };

export const MENSAGEM_BASE64: Record<MotivoBase64Invalido, string> = {
  vazio: 'Digite ou cole algo para converter.',
  caracteres: 'Há caracteres que não pertencem ao alfabeto Base64 neste texto.',
  tamanho: 'O comprimento não fecha: falta ou sobra caractere para completar um bloco.',
  utf8: 'Os bytes decodificados não formam texto UTF-8 válido. Talvez seja um arquivo binário.',
};

function bytesParaBinario(bytes: Uint8Array): string {
  // Em pedaços, porque String.fromCharCode com um spread de centenas de
  // milhares de argumentos estoura a pilha de chamadas.
  const PEDACO = 0x8000;
  let saida = '';

  for (let i = 0; i < bytes.length; i += PEDACO) {
    saida += String.fromCharCode(...bytes.subarray(i, i + PEDACO));
  }

  return saida;
}

/** Base64 padrão vira Base64URL: +/ viram -_ e o preenchimento sai. */
function paraUrl(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Caminho inverso, reconstruindo o preenchimento com '='. */
function deUrl(base64url: string): string {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
}

export function codificarBase64(entrada: string, url = false): ResultadoBase64 {
  if (entrada === '') return { ok: false, motivo: 'vazio' };

  const bytes = new TextEncoder().encode(entrada);
  const base64 = btoa(bytesParaBinario(bytes));

  return { ok: true, saida: url ? paraUrl(base64) : base64 };
}

export function decodificarBase64(entrada: string): ResultadoBase64 {
  // Espaços e quebras aparecem o tempo todo em Base64 colado de e-mail ou de
  // certificado PEM, e não fazem parte do dado.
  const limpo = entrada.replace(/\s/g, '');

  if (limpo === '') return { ok: false, motivo: 'vazio' };
  if (!/^[A-Za-z0-9+/\-_]*={0,2}$/.test(limpo)) return { ok: false, motivo: 'caracteres' };

  const normalizado = deUrl(limpo);

  if (normalizado.length % 4 !== 0) return { ok: false, motivo: 'tamanho' };

  let binario: string;

  try {
    binario = atob(normalizado);
  } catch {
    return { ok: false, motivo: 'tamanho' };
  }

  const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));

  try {
    // fatal: true faz a decodificação falhar em vez de devolver caracteres de
    // substituição — assim dá para avisar que o conteúdo não é texto.
    return { ok: true, saida: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, motivo: 'utf8' };
  }
}

/** Mostra os bytes em hexadecimal, útil quando a saída não é texto. */
export function decodificarParaHex(entrada: string): ResultadoBase64 {
  const limpo = entrada.replace(/\s/g, '');

  if (limpo === '') return { ok: false, motivo: 'vazio' };
  if (!/^[A-Za-z0-9+/\-_]*={0,2}$/.test(limpo)) return { ok: false, motivo: 'caracteres' };

  const normalizado = deUrl(limpo);

  if (normalizado.length % 4 !== 0) return { ok: false, motivo: 'tamanho' };

  try {
    const binario = atob(normalizado);
    const hex = [...binario]
      .map((caractere) => caractere.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(' ');

    return { ok: true, saida: hex };
  } catch {
    return { ok: false, motivo: 'tamanho' };
  }
}

/** true quando o texto usa os caracteres exclusivos do Base64URL. */
export function pareceBase64Url(entrada: string): boolean {
  return /[-_]/.test(entrada) && !/[+/]/.test(entrada);
}
