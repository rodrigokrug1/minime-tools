/**
 * Decodificação de JWT, inteiramente no navegador.
 *
 * Decodifica e lê — não verifica assinatura. Verificar exigiria a chave
 * secreta, e pedir a chave secreta de alguém numa página web é exatamente o
 * que uma ferramenta de desenvolvedor não deve fazer.
 */

export type MotivoJwtInvalido = 'vazio' | 'partes' | 'base64' | 'json';

export type TokenDecodificado = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Terceira parte, em base64url. Fica como veio: não é decodificável como texto. */
  assinatura: string;
  /** Datas dos claims padrão, quando presentes e numéricas. */
  emitidoEm?: Date;
  expiraEm?: Date;
  validoApartirDe?: Date;
  /** true quando `exp` já passou em relação a `agora`. */
  expirado?: boolean;
};

export type ResultadoJwt =
  | { ok: true; token: TokenDecodificado }
  | { ok: false; motivo: MotivoJwtInvalido };

export const MENSAGEM_JWT: Record<MotivoJwtInvalido, string> = {
  vazio: 'Cole um token para decodificar.',
  partes: 'Um JWT tem três partes separadas por ponto. Confira se o token veio inteiro.',
  base64: 'Alguma parte do token não está em base64url válido.',
  json: 'O header ou o payload não contêm JSON válido depois de decodificados.',
};

/** base64url difere do base64 comum em dois caracteres e no preenchimento. */
function decodificarBase64Url(parte: string): string | null {
  const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  try {
    const bytes = Uint8Array.from(atob(preenchido), (caractere) => caractere.charCodeAt(0));

    // Decodifica como UTF-8: claims com acento viram lixo sem este passo.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function dataDoClaim(valor: unknown): Date | undefined {
  return typeof valor === 'number' && Number.isFinite(valor) ? new Date(valor * 1000) : undefined;
}

export function decodificarJwt(entrada: string, agora = new Date()): ResultadoJwt {
  const bruto = entrada.trim().replace(/^Bearer\s+/i, '');

  if (bruto === '') return { ok: false, motivo: 'vazio' };

  const partes = bruto.split('.');

  if (partes.length !== 3) return { ok: false, motivo: 'partes' };

  const textoHeader = decodificarBase64Url(partes[0] as string);
  const textoPayload = decodificarBase64Url(partes[1] as string);

  if (textoHeader === null || textoPayload === null) return { ok: false, motivo: 'base64' };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;

  try {
    header = JSON.parse(textoHeader);
    payload = JSON.parse(textoPayload);
  } catch {
    return { ok: false, motivo: 'json' };
  }

  const expiraEm = dataDoClaim(payload.exp);

  return {
    ok: true,
    token: {
      header,
      payload,
      assinatura: partes[2] as string,
      ...(dataDoClaim(payload.iat) ? { emitidoEm: dataDoClaim(payload.iat) as Date } : {}),
      ...(expiraEm ? { expiraEm, expirado: expiraEm.getTime() < agora.getTime() } : {}),
      ...(dataDoClaim(payload.nbf) ? { validoApartirDe: dataDoClaim(payload.nbf) as Date } : {}),
    },
  };
}

/** Nome por extenso dos claims registrados, para a interface explicar cada um. */
export const DESCRICAO_CLAIM: Record<string, string> = {
  iss: 'emissor do token',
  sub: 'sujeito — a quem o token se refere',
  aud: 'destinatário pretendido',
  exp: 'expira em',
  nbf: 'não vale antes de',
  iat: 'emitido em',
  jti: 'identificador único do token',
};
