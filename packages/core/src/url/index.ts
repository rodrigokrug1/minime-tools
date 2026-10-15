/**
 * Normalização e validação de URL para o encurtador.
 *
 * Este módulo é o template de toda ferramenta do MiniMe: funções puras, sem
 * React, sem DOM, sem `window`. Isso permite usar a mesma lógica no site, numa
 * API pública e numa CLI sem reescrever nada — e torna o teste trivial.
 */

/** Motivo pelo qual uma URL foi recusada. A UI traduz cada caso. */
export type MotivoInvalido =
  | 'vazia'
  | 'malformada'
  | 'esquema-nao-suportado'
  | 'host-local'
  | 'host-proprio';

export type ResultadoValidacao = { ok: true; url: URL } | { ok: false; motivo: MotivoInvalido };

const ESQUEMAS_PERMITIDOS = new Set(['http:', 'https:']);

/** Hosts que nunca fazem sentido encurtar: o link não resolveria fora da máquina. */
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/** Domínios do próprio serviço — encurtar um link nosso criaria um laço de redirect. */
const HOSTS_PROPRIOS = new Set(['minime.cloud', 'link.minime.cloud', 'api.minime.cloud']);

/**
 * Acrescenta o esquema quando ausente e remove espaços em volta.
 *
 * Não valida nada: é só o preparo para `validarUrl`. Colar
 * "exemplo.com/promo" do navegador é o caso comum, e sem o esquema o
 * construtor `URL` recusaria uma entrada perfeitamente válida.
 */
export function normalizarUrl(entrada: string): string {
  const texto = entrada.trim();

  if (texto === '') return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(texto)) return texto;

  // Um "esquema:" sem "//" (mailto:, javascript:, data:) não recebe https://
  // na frente: isso mascararia a entrada e o validador precisa vê-la como é.
  if (/^[a-z][a-z0-9+.-]*:/i.test(texto)) return texto;

  return `https://${texto}`;
}

/** Faixas privadas e reservadas em IPv4, que também não resolvem fora da rede local. */
function ehIpv4Privado(host: string): boolean {
  const partes = host.split('.');

  if (partes.length !== 4) return false;

  const octetos = partes.map((parte) => Number(parte));

  if (octetos.some((octeto) => !Number.isInteger(octeto) || octeto < 0 || octeto > 255)) {
    return false;
  }

  const [a, b] = octetos as [number, number, number, number];

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Valida a URL de destino antes de chegar à API.
 *
 * Roda no navegador para dar resposta imediata e poupar uma requisição, mas
 * nunca substitui a validação do servidor: o cliente é território do usuário.
 */
export function validarUrl(entrada: string): ResultadoValidacao {
  const normalizada = normalizarUrl(entrada);

  if (normalizada === '') return { ok: false, motivo: 'vazia' };

  let url: URL;

  try {
    url = new URL(normalizada);
  } catch {
    return { ok: false, motivo: 'malformada' };
  }

  if (!ESQUEMAS_PERMITIDOS.has(url.protocol)) {
    return { ok: false, motivo: 'esquema-nao-suportado' };
  }

  // Hostname vem entre colchetes em IPv6; normalizamos para comparar.
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === '') return { ok: false, motivo: 'malformada' };
  if (HOSTS_LOCAIS.has(host) || host.endsWith('.localhost') || ehIpv4Privado(host)) {
    return { ok: false, motivo: 'host-local' };
  }
  if (HOSTS_PROPRIOS.has(host)) {
    return { ok: false, motivo: 'host-proprio' };
  }

  return { ok: true, url };
}

/** Mensagem em voz ativa para cada recusa: o que houve e o que fazer. */
export const MENSAGEM_POR_MOTIVO: Record<MotivoInvalido, string> = {
  vazia: 'Cole uma URL para encurtar.',
  malformada: 'Esta URL não é válida. Confira se não falta uma parte do endereço.',
  'esquema-nao-suportado': 'Só dá para encurtar endereços http e https.',
  'host-local': 'Este endereço só existe na sua rede, então o link não funcionaria para ninguém.',
  'host-proprio':
    'Este endereço já é do MiniMe. Encurtá-lo criaria um redirecionamento em círculo.',
};
