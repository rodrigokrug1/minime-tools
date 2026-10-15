import type { APIRoute } from 'astro';
import { atualizadoEm, caminhoDa, FERRAMENTAS_ATIVAS, PUBLICADO_EM } from '../lib/registry';

/**
 * Só ferramentas ativas entram. Uma entrada "planejado" não tem rota, e
 * anunciá-la no sitemap geraria 404 no rastreamento.
 *
 * Sem `changefreq` nem `priority`: o Google ignora os dois há anos, e declarar
 * o que ninguém lê só aumenta o arquivo. O `lastmod` ele usa — por isso vem do
 * registry, e não da data do build, que mudaria a cada publicação sem que
 * página nenhuma tivesse mudado.
 */
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://minime.cloud')).origin;

  // A barra final acompanha o canonical gerado pelo Astro: sem isso o buscador
  // enxergaria duas URLs para a mesma página.
  const rotas: Array<{ caminho: string; lastmod: string }> = [
    { caminho: '/', lastmod: PUBLICADO_EM },
    ...FERRAMENTAS_ATIVAS.map((ferramenta) => ({
      caminho: `${caminhoDa(ferramenta)}/`,
      lastmod: atualizadoEm(ferramenta),
    })),
  ];

  const corpo = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rotas
  .map(
    ({ caminho, lastmod }) =>
      `  <url><loc>${base}${caminho}</loc><lastmod>${lastmod}</lastmod></url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(corpo, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
