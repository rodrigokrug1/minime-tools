/**
 * Dados estruturados (JSON-LD) de cada página.
 *
 * Não mudam posição no resultado de busca — descrevem o que a página é, para o
 * buscador poder mostrá-la de forma mais rica. Tudo aqui é verificável no
 * próprio HTML: nada de nota de avaliação ou contagem de uso, que seriam
 * invenção e, além de desonestas, motivo de penalização.
 */
import { slugDaRota } from './historico';
import { buscarFerramenta, caminhoDa, FERRAMENTAS_ATIVAS } from './registry';

const DESCRICAO_DO_SITE =
  'Ferramentas online para desenvolvedores brasileiros. Rodam no seu navegador: nada do que você cola sai da sua máquina.';

/** Slug do cartão de compartilhamento da página. */
export function slugDoCartao(caminho: string): string {
  const slug = slugDaRota(caminho);

  // Só ferramenta ativa tem cartão próprio gerado no build. Qualquer outra
  // rota — inclusive a 404 — cai no cartão do site.
  return slug && FERRAMENTAS_ATIVAS.some((f) => f.slug === slug) ? slug : 'home';
}

export function dadosEstruturados(caminho: string, origem: string): object[] {
  const url = (rota: string) => new URL(rota, origem).href;
  const slug = slugDaRota(caminho);
  const ferramenta = slug ? buscarFerramenta(slug) : undefined;

  if (ferramenta?.status !== 'ativo') {
    if (caminho !== '/') return [];

    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MiniMe',
        url: url('/'),
        description: DESCRICAO_DO_SITE,
        inLanguage: 'pt-BR',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Ferramentas do MiniMe',
        itemListElement: FERRAMENTAS_ATIVAS.map((item, indice) => ({
          '@type': 'ListItem',
          position: indice + 1,
          name: item.nome,
          url: url(`${caminhoDa(item)}/`),
        })),
      },
    ];
  }

  const enderecoDaFerramenta = url(`${caminhoDa(ferramenta)}/`);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: ferramenta.nome,
      url: enderecoDaFerramenta,
      description: ferramenta.descricao,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requer JavaScript',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      publisher: { '@type': 'Organization', name: 'MiniMe', url: url('/') },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'MiniMe', item: url('/') },
        { '@type': 'ListItem', position: 2, name: ferramenta.nome, item: enderecoDaFerramenta },
      ],
    },
  ];
}
