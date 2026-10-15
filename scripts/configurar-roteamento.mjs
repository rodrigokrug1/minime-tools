#!/usr/bin/env node
/**
 * Cria (ou atualiza) a CloudFront Function de roteamento e a associa à
 * distribuição que serve o site.
 *
 * Roda uma vez, não a cada deploy. Sem ela, qualquer rota em subpasta devolve
 * AccessDenied: o endpoint REST do S3 não tem documento de índice, e a
 * política do bucket concede só `GetObject` — sem `ListBucket`, uma chave
 * inexistente vira 403, não 404.
 *
 * De brinde, mapeia 403 e 404 para a página de erro do próprio site.
 */
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharDistribuicao, aws, awsJson, DOMINIO, encerrar } from './aws.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CODIGO = resolve(AQUI, 'roteamento.js');
const NOME_FUNCAO = 'minime-roteamento';

if (!existsSync(CODIGO)) encerrar(`${CODIGO} não encontrado.`);

const temporario = mkdtempSync(join(tmpdir(), 'minime-'));

function escrever(nome, conteudo) {
  const caminho = join(temporario, nome);
  writeFileSync(caminho, conteudo);

  return caminho;
}

const distribuicao = acharDistribuicao();

console.log(
  `\n→ ${DOMINIO}\n  distribuição: ${distribuicao.id}\n  origem: ${distribuicao.origem}\n`,
);

if (distribuicao.endpointDeSite) {
  encerrar(
    'A origem é o endpoint de website do S3, que já resolve índice de diretório.\n' +
      '  Esta função não é necessária — o erro vem de outro lugar.',
  );
}

// -- 1. Função ----------------------------------------------------------------
const configuracao = escrever(
  'funcao.json',
  JSON.stringify({
    Comment: 'Indice de diretorio e canonico www para o apex',
    Runtime: 'cloudfront-js-2.0',
  }),
);

// `tolerarFalha`: a primeira execução não encontra a função, e isso é o caso
// normal, não um erro.
const existente = awsJson(['cloudfront', 'describe-function', '--name', NOME_FUNCAO], {
  tolerarFalha: true,
});

let resposta;

if (existente) {
  console.log('  Função já existe: atualizando o código.');
  resposta = awsJson([
    'cloudfront',
    'update-function',
    '--name',
    NOME_FUNCAO,
    '--if-match',
    existente.ETag,
    '--function-config',
    `file://${configuracao}`,
    '--function-code',
    `fileb://${CODIGO}`,
  ]);
} else {
  console.log('  Criando a função.');
  resposta = awsJson([
    'cloudfront',
    'create-function',
    '--name',
    NOME_FUNCAO,
    '--function-config',
    `file://${configuracao}`,
    '--function-code',
    `fileb://${CODIGO}`,
  ]);
}

const arn = resposta?.FunctionSummary?.FunctionMetadata?.FunctionARN;

if (!arn) encerrar('A AWS não devolveu o ARN da função.');

// Função recém-criada nasce em DEVELOPMENT. Só a versão LIVE pode ser
// associada a uma distribuição.
aws(
  [
    'cloudfront',
    'publish-function',
    '--name',
    NOME_FUNCAO,
    '--if-match',
    resposta.ETag,
    '--no-cli-pager',
    '--output',
    'text',
    '--query',
    'FunctionSummary.FunctionMetadata.Stage',
  ],

  // Capturado em vez de impresso: a resposta inteira da AWS no terminal
  // esconde as duas linhas que interessam.
  { capturar: true },
);

console.log('  Publicada em LIVE.');

// -- 2. Distribuição ----------------------------------------------------------
const atual = awsJson(['cloudfront', 'get-distribution-config', '--id', distribuicao.id]);

if (!atual?.DistributionConfig) encerrar('Não foi possível ler a configuração da distribuição.');

const config = atual.DistributionConfig;

config.DefaultCacheBehavior.FunctionAssociations = {
  Quantity: 1,
  Items: [{ FunctionARN: arn, EventType: 'viewer-request' }],
};

// 403 e 404 caem na mesma página porque, sem `ListBucket`, o S3 não distingue
// "não existe" de "não pode ver". O status reescrito é 404: é o que diz ao
// buscador para tirar a URL do índice.
config.CustomErrorResponses = {
  Quantity: 2,
  Items: [403, 404].map((codigo) => ({
    ErrorCode: codigo,
    ResponsePagePath: '/404.html',
    ResponseCode: '404',
    ErrorCachingMinTTL: 300,
  })),
};

const novo = escrever('distribuicao.json', JSON.stringify(config));

aws(
  [
    'cloudfront',
    'update-distribution',
    '--id',
    distribuicao.id,
    '--if-match',
    atual.ETag,
    '--distribution-config',
    `file://${novo}`,
    '--no-cli-pager',
    '--output',
    'text',
    '--query',
    'Distribution.Status',
  ],
  { capturar: true },
);

console.log(
  '\n✔ Função associada e páginas de erro configuradas.\n' +
    '  A distribuição leva ~5 minutos para propagar a mudança.\n',
);
