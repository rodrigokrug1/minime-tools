/**
 * Peças comuns aos scripts de deploy: chamada ao AWS CLI e descoberta da
 * distribuição a partir do domínio.
 */
import { spawnSync } from 'node:child_process';

export const DOMINIO = process.env.MINIME_DOMINIO ?? 'minime.cloud';
/**
 * Na máquina, o perfil nomeado do AWS CLI. No GitHub Actions não existe perfil
 * nenhum: a credencial chega por variável de ambiente, de vida curta, e mandar
 * `--profile` ali faria o comando procurar um arquivo que não existe.
 *
 * O sinal é `GITHUB_ACTIONS`, que só o próprio Actions define. A primeira
 * versão disto deduzia o ambiente pela presença de `AWS_ACCESS_KEY_ID`, e era
 * frágil: quem exporta essa variável na própria máquina perderia o perfil sem
 * perceber, publicando com uma credencial que não a pretendida.
 */
const PERFIL = process.env.AWS_PROFILE ?? (process.env.GITHUB_ACTIONS ? null : 'rodrigokrug');

export function encerrar(mensagem) {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}

/**
 * Com `shell: true` o Node concatena os argumentos numa linha de comando em
 * vez de passá-los um a um — e por isso avisa (DEP0190) que caractere especial
 * em argumento vira injeção. A saída é não usar shell: no Windows o AWS CLI v2
 * instala um `aws.exe` de verdade, que o Node executa direto.
 *
 * O `.cmd` fica como plano B, para quem tem só o wrapper no PATH. Aí o shell é
 * inevitável — o Node se recusa a executar `.cmd` sem ele — e cada argumento
 * vai citado na mão.
 */
const EXECUTAVEL = process.platform === 'win32' ? 'aws.exe' : 'aws';
let precisaDeShell = false;

function citar(argumento) {
  if (!precisaDeShell) return argumento;

  return /[\s&|<>^"]/.test(argumento) ? `"${argumento}"` : argumento;
}

export function aws(argumentos, { capturar = false, tolerarFalha = false } = {}) {
  const completos = PERFIL ? [...argumentos, '--profile', PERFIL] : [...argumentos];

  const executar = () =>
    spawnSync(precisaDeShell ? 'aws' : EXECUTAVEL, completos.map(citar), {
      stdio: capturar ? ['inherit', 'pipe', tolerarFalha ? 'ignore' : 'inherit'] : 'inherit',
      encoding: 'utf8',
      shell: precisaDeShell,
    });

  let resultado = executar();

  // Sem aws.exe no PATH: repete pelo shell, que acha o aws.cmd.
  if (resultado.error?.code === 'ENOENT' && process.platform === 'win32' && !precisaDeShell) {
    precisaDeShell = true;
    resultado = executar();
  }

  if (resultado.error?.code === 'ENOENT') {
    encerrar('Comando "aws" não encontrado. Instale o AWS CLI v2.');
  }

  if (resultado.status !== 0) {
    if (tolerarFalha) return null;

    encerrar(`"aws ${argumentos[0]} ${argumentos[1]}" falhou com código ${resultado.status}.`);
  }

  return capturar ? resultado.stdout.trim() : '';
}

export function awsJson(argumentos, opcoes = {}) {
  const saida = aws([...argumentos, '--output', 'json'], { ...opcoes, capturar: true });

  return saida ? JSON.parse(saida) : null;
}

/**
 * Acha a distribuição que declara o domínio como alias, e o bucket pela origem
 * dela. Um id anotado em arquivo é um id para esquecer de atualizar — e num
 * `sync --delete`, apontar para o bucket errado apaga o site errado.
 */
export function acharDistribuicao() {
  // Na automação os dois vêm declarados, e a descoberta não roda. Não é
  // economia de chamada: descobrir exige `cloudfront:ListDistributions`, que é
  // uma permissão sobre a conta inteira, não sobre uma distribuição. Num
  // ambiente onde ninguém está olhando, a credencial tem de poder fazer
  // exatamente o que o deploy faz e nada além.
  const bucketDeclarado = process.env.MINIME_BUCKET;
  const distribuicaoDeclarada = process.env.MINIME_DISTRIBUICAO;

  if (bucketDeclarado && distribuicaoDeclarada) {
    return {
      id: distribuicaoDeclarada,
      origem: `${bucketDeclarado}.s3.amazonaws.com`,
      bucket: bucketDeclarado,
      endpointDeSite: false,
      declarado: true,
    };
  }

  // A listagem vem inteira e o filtro é feito aqui, em vez de num `--query`: a
  // expressão JMESPath precisaria de caracteres que o cmd.exe interpreta como
  // operador, e são poucas distribuições.
  const listagem = awsJson(['cloudfront', 'list-distributions']);
  const todas = listagem?.DistributionList?.Items ?? [];
  const encontradas = todas.filter((d) => (d.Aliases?.Items ?? []).includes(DOMINIO));

  if (encontradas.length === 0) {
    encerrar(`Nenhuma distribuição do CloudFront declara "${DOMINIO}" como alias.`);
  }

  if (encontradas.length > 1) {
    encerrar(`Mais de uma distribuição declara "${DOMINIO}". Resolva isso antes de continuar.`);
  }

  const [distribuicao] = encontradas;
  const origem = distribuicao.Origins?.Items?.[0]?.DomainName ?? '';

  if (!origem.includes('.s3')) {
    encerrar(
      `A origem da distribuição ${distribuicao.Id} não é um bucket S3: ${origem || '(vazia)'}`,
    );
  }

  return {
    id: distribuicao.Id,
    origem,

    // `meu-bucket.s3.us-east-1.amazonaws.com` e
    // `meu-bucket.s3-website-us-east-1.amazonaws.com` apontam para o mesmo
    // bucket; o que muda é o tipo de endpoint — e isso decide se as rotas em
    // subpasta funcionam sem ajuda.
    bucket: origem.split('.s3')[0],
    endpointDeSite: origem.includes('.s3-website'),
    declarado: false,
  };
}
