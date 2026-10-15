import type { APIRoute, GetStaticPaths } from 'astro';
import { desenharCartao } from '../../lib/og';
import { FERRAMENTAS_ATIVAS } from '../../lib/registry';

/**
 * Cartão de compartilhamento por ferramenta, desenhado no build.
 *
 * Uma imagem por rota, e não uma genérica para o site inteiro: o link de uma
 * ferramenta costuma ser colado num grupo de dev, onde o cartão é o que decide
 * se alguém clica. Um cartão que diz "Formatador de SQL" trabalha; um que diz
 * só "MiniMe" não.
 */
export const getStaticPaths: GetStaticPaths = () => [
  { params: { slug: 'home' } },
  ...FERRAMENTAS_ATIVAS.map((ferramenta) => ({ params: { slug: ferramenta.slug } })),
];

export const GET: APIRoute = ({ params }) => {
  const ferramenta = FERRAMENTAS_ATIVAS.find((f) => f.slug === params.slug);

  const png = ferramenta
    ? desenharCartao({
        titulo: ferramenta.nome,
        descricao: ferramenta.descricao,

        // O selo só aparece onde é verdade. O encurtador precisa do servidor;
        // dizer que ele roda no navegador seria mentira no cartão.
        selo: ferramenta.clientSide ? 'roda no seu navegador' : undefined,
      })
    : desenharCartao({
        titulo: 'Ferramentas que rodam no seu navegador',
        descricao: 'CPF, CNPJ, JSON, SQL, Base64, JWT, cron e o resto do dia a dia.',
        selo: 'nada sai da sua máquina',
      });

  // Saída estática: o Astro grava o PNG em disco e o cabeçalho de cache quem
  // define é o `publicar.mjs`, na hora do sync.
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
