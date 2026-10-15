#!/usr/bin/env node
/**
 * Publica o build do site na distribuição do CloudFront que já serve
 * minime.cloud.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharDistribuicao, aws, DOMINIO, encerrar } from './aws.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'apps', 'web', 'dist');

if (!existsSync(join(DIST, 'index.html'))) {
  encerrar(`${DIST} não tem index.html. Rode "pnpm build" antes de publicar.`);
}

const distribuicao = acharDistribuicao();

console.log(
  `\n→ ${DOMINIO}\n  distribuição: ${distribuicao.id}\n  bucket: ${distribuicao.bucket}\n`,
);

// Os arquivos de `_astro/` têm hash do conteúdo no nome: mudar o conteúdo muda
// o nome, então podem ficar um ano no cache sem risco de servir versão velha.
aws([
  's3',
  'sync',
  DIST,
  `s3://${distribuicao.bucket}`,
  '--delete',
  '--exclude',
  '*',
  '--include',
  '_astro/*',
  '--cache-control',
  'public, max-age=31536000, immutable',
]);

// O resto — HTML, sitemap, robots, ícones — tem nome fixo e precisa ser
// revalidado a cada visita, senão uma ferramenta nova fica invisível até o
// cache do navegador expirar. O `--delete` aqui é o que tira do ar os
// arquivos do frontend antigo.
aws([
  's3',
  'sync',
  DIST,
  `s3://${distribuicao.bucket}`,
  '--delete',
  '--exclude',
  '_astro/*',
  '--cache-control',
  'public, max-age=0, must-revalidate',
]);

// Uma invalidação com curinga conta como um caminho na cota gratuita de mil
// por mês — mais barato que listar os HTML que mudaram.
aws([
  'cloudfront',
  'create-invalidation',
  '--distribution-id',
  distribuicao.id,
  '--paths',
  '/*',
  '--no-cli-pager',
]);

console.log('\n✔ Publicado. A invalidação leva ~1 minuto para propagar.\n');
