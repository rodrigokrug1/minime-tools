/**
 * Desenho dos cartões de compartilhamento (og:image).
 *
 * Roda só no build, nunca no navegador: importa `node:fs` e o canvas nativo.
 * O endpoint em `pages/og/[slug].png.ts` é o único lugar que o chama.
 *
 * O cartão é desenhado direto no canvas, e não com uma biblioteca que serializa
 * HTML para imagem: essas passam por `<foreignObject>` de SVG, onde o navegador
 * não carrega fonte externa — e o cartão sairia com a fonte errada, que é
 * justamente o que ele tem de mostrar.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';

export const LARGURA = 1200;
export const ALTURA = 630;

// Mesmos valores de `styles/global.css`. Duplicados aqui porque o canvas não
// lê CSS; se um mudar lá, muda aqui.
const FUNDO = '#15141b';
const ACENTO = '#6d5bd0';
const ACENTO_FRACO = '#8f81dd';
const TEXTO = '#edebf2';
const TEXTO_FRACO = '#8a8598';
const BORDA = '#2b2834';

const DISPLAY = 'MiniMe Display';
const SANS = 'MiniMe Sans';
const MONO = 'MiniMe Mono';

const exigir = createRequire(import.meta.url);

let fontesRegistradas = false;

/**
 * Registra as fontes do próprio site, a partir dos pacotes já instalados. Os
 * arquivos são variáveis (eixo de peso), e o canvas usa a instância padrão —
 * daí o peso vir do desenho, não do nome da família.
 */
function registrarFontes(): void {
  if (fontesRegistradas) return;

  const arquivos: [string, string][] = [
    ['@fontsource-variable/martian-mono/files/martian-mono-latin-wght-normal.woff2', DISPLAY],
    ['@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', SANS],
    ['@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', MONO],
  ];

  for (const [modulo, nome] of arquivos) {
    GlobalFonts.register(readFileSync(exigir.resolve(modulo)), nome);
  }

  fontesRegistradas = true;
}

/** Quebra o texto em linhas que cabem na largura, até o limite de linhas. */
function quebrar(
  ctx: SKRSContext2D,
  texto: string,
  largura: number,
  maximoDeLinhas: number,
): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;

    if (ctx.measureText(tentativa).width <= largura || !atual) {
      atual = tentativa;
      continue;
    }

    linhas.push(atual);
    atual = palavra;

    if (linhas.length === maximoDeLinhas) break;
  }

  if (linhas.length < maximoDeLinhas && atual) linhas.push(atual);

  // Sobrou texto: a última linha ganha reticências em vez de cortar no meio da
  // palavra.
  const sobrou = linhas.join(' ').length < texto.length;
  const ultima = linhas[linhas.length - 1];

  if (sobrou && ultima) {
    linhas[linhas.length - 1] = `${ultima.replace(/[,.;:]$/, '')}…`;
  }

  return linhas;
}

/** A marca: a mesma forma do favicon, um quadrado menor dentro do maior. */
function desenharMarca(ctx: SKRSContext2D, x: number, y: number, lado: number): void {
  const u = lado / 32;

  ctx.strokeStyle = ACENTO;
  ctx.lineWidth = 2.5 * u;
  ctx.beginPath();
  ctx.roundRect(x + 4.75 * u, y + 4.75 * u, 22.5 * u, 22.5 * u, 6 * u);
  ctx.stroke();

  ctx.fillStyle = ACENTO;
  ctx.beginPath();
  ctx.roundRect(x + 12 * u, y + 12 * u, 8 * u, 8 * u, 2.25 * u);
  ctx.fill();
}

export type Cartao = {
  titulo: string;
  descricao: string;
  /** Texto do rodapé à direita. Vazio esconde a linha. */
  selo?: string;
};

// `Uint8Array<ArrayBuffer>`, e não o `Uint8Array` pelado: a partir do
// TypeScript 5.7 o tipo é genérico e o padrão é `ArrayBufferLike`, que o
// `Response` recusa.
export function desenharCartao({ titulo, descricao, selo }: Cartao): Uint8Array<ArrayBuffer> {
  registrarFontes();

  const canvas = createCanvas(LARGURA, ALTURA);
  const ctx = canvas.getContext('2d');

  const margem = 80;
  const util = LARGURA - margem * 2;

  ctx.fillStyle = FUNDO;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Faixa de acento na borda superior: dá cor ao cartão em miniatura, onde o
  // texto já não se lê.
  ctx.fillStyle = ACENTO;
  ctx.fillRect(0, 0, LARGURA, 8);

  desenharMarca(ctx, margem, 72, 56);

  ctx.font = `600 30px "${DISPLAY}"`;
  ctx.fillStyle = TEXTO;
  ctx.textBaseline = 'middle';
  ctx.fillText('MiniMe', margem + 76, 72 + 30);

  // O bloco de texto é ancorado pela base, não pelo topo: com o topo fixo, um
  // título de duas linhas somado a uma descrição de duas empurra o texto por
  // cima do rodapé. Medindo antes de desenhar, o cartão se acomoda sozinho.
  const BASE_DO_TEXTO = 466;
  const TOPO_MINIMO = 180;
  const ESPACO = 44;

  const tamanhoDoTitulo = titulo.length > 28 ? 58 : titulo.length > 18 ? 70 : 82;
  const alturaDaLinhaDoTitulo = tamanhoDoTitulo * 1.15;
  const alturaDaLinhaDaDescricao = 42;

  ctx.font = `600 ${tamanhoDoTitulo}px "${DISPLAY}"`;
  const linhasDoTitulo = quebrar(ctx, titulo, util, 2);

  ctx.font = `400 32px "${SANS}"`;
  let linhasDaDescricao = quebrar(ctx, descricao, util, 2);

  const alturaTotal = () =>
    linhasDoTitulo.length * alturaDaLinhaDoTitulo +
    (linhasDaDescricao.length > 0 ? ESPACO : 0) +
    linhasDaDescricao.length * alturaDaLinhaDaDescricao;

  // Caso extremo — título longo e descrição longa: a descrição cede primeiro,
  // porque o nome da ferramenta é o que precisa ser lido na miniatura.
  while (linhasDaDescricao.length > 1 && BASE_DO_TEXTO - alturaTotal() < TOPO_MINIMO) {
    linhasDaDescricao = quebrar(ctx, descricao, util, linhasDaDescricao.length - 1);
  }

  // Centralizado no espaço livre entre a marca e o rodapé: ancorado só pela
  // base, um cartão de título curto abre um vão no topo e aperta o rodapé.
  const topo = Math.max(
    TOPO_MINIMO,
    TOPO_MINIMO + (BASE_DO_TEXTO - TOPO_MINIMO - alturaTotal()) / 2,
  );

  let y = topo + tamanhoDoTitulo;

  ctx.font = `600 ${tamanhoDoTitulo}px "${DISPLAY}"`;
  ctx.fillStyle = TEXTO;
  ctx.textBaseline = 'alphabetic';

  for (const linha of linhasDoTitulo) {
    ctx.fillText(linha, margem, y);
    y += alturaDaLinhaDoTitulo;
  }

  if (linhasDaDescricao.length > 0) {
    ctx.font = `400 32px "${SANS}"`;
    ctx.fillStyle = TEXTO_FRACO;

    y += ESPACO - tamanhoDoTitulo + 32;

    for (const linha of linhasDaDescricao) {
      ctx.fillText(linha, margem, y);
      y += alturaDaLinhaDaDescricao;
    }
  }

  // Rodapé
  const baseDoRodape = ALTURA - margem;

  ctx.strokeStyle = BORDA;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margem, baseDoRodape - 46);
  ctx.lineTo(LARGURA - margem, baseDoRodape - 46);
  ctx.stroke();

  ctx.font = `500 28px "${MONO}"`;
  ctx.fillStyle = ACENTO_FRACO;
  ctx.fillText('minime.cloud', margem, baseDoRodape);

  if (selo) {
    ctx.font = `400 26px "${SANS}"`;
    ctx.fillStyle = TEXTO_FRACO;
    ctx.textAlign = 'right';
    ctx.fillText(selo, LARGURA - margem, baseDoRodape);
    ctx.textAlign = 'left';
  }

  const png = canvas.toBuffer('image/png');

  // `Buffer` do Node não é um `BodyInit` aceito pelo `Response`, e uma view
  // sobre o buffer dele também não: o tipo sai como `Uint8Array<ArrayBufferLike>`
  // e o `Response` pede um respaldado por `ArrayBuffer`. A cópia resolve o tipo
  // e custa alguns KB uma vez por cartão, no build.
  const copia = new Uint8Array(png.byteLength);
  copia.set(png);

  return copia;
}
