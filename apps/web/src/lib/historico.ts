/**
 * Histórico de ferramentas usadas, guardado no navegador de quem visita.
 *
 * Fica em `localStorage` e nunca sai da máquina: não há conta, não há servidor
 * e nada é enviado. A consequência é que o histórico é por navegador — quem
 * abre o site no celular não vê o que usou no computador, e isso é o
 * comportamento pretendido, não uma limitação a contornar.
 */

const CHAVE = 'minime-historico';
const LIMITE = 5;

/**
 * Toda leitura e escrita é protegida: em navegação privada, com dados de site
 * bloqueados ou com a cota estourada, o acesso lança. O histórico é conforto,
 * então falhar em silêncio é a resposta certa.
 */
export function lerHistorico(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);

    if (!bruto) return [];

    const valor: unknown = JSON.parse(bruto);

    if (!Array.isArray(valor)) return [];

    return valor.filter((item): item is string => typeof item === 'string').slice(0, LIMITE);
  } catch {
    return [];
  }
}

/** Põe o slug no topo, sem repetir, e corta no limite. */
export function registrarVisita(slug: string): void {
  try {
    const atual = lerHistorico().filter((item) => item !== slug);

    localStorage.setItem(CHAVE, JSON.stringify([slug, ...atual].slice(0, LIMITE)));
  } catch {
    /* storage indisponível: o histórico simplesmente não acumula */
  }
}

export function limparHistorico(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* nada a fazer */
  }
}

/** Extrai o slug de /ferramentas/<slug>/ — devolve null em qualquer outra rota. */
export function slugDaRota(caminho: string): string | null {
  const casa = caminho.match(/^\/ferramentas\/([a-z0-9-]+)\/?$/);

  return casa?.[1] ?? null;
}
