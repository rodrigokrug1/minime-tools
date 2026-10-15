import type { Linha } from './tokens.js';

/**
 * Cálculo do layout da imagem de código.
 *
 * Fica separado do desenho e sem nenhuma referência a canvas, para poder ser
 * testado: as medidas são aritmética sobre a largura de caractere da fonte
 * monoespaçada, não medição de texto real.
 */

export type OpcoesLayout = {
  /** Corpo da fonte, em pixels lógicos. */
  corpo: number;
  /** Largura de um caractere, em pixels, medida uma vez no canvas. */
  larguraCaractere: number;
  mostrarNumeros: boolean;
  mostrarCromo: boolean;
  /** Respiro colorido em volta da janela. */
  margem: number;
};

export type Layout = {
  /** Dimensões finais em pixels lógicos. */
  largura: number;
  altura: number;
  /** Canto superior esquerdo da janela. */
  janelaX: number;
  janelaY: number;
  janelaLargura: number;
  janelaAltura: number;
  /** Onde a primeira linha de código começa. */
  codigoX: number;
  codigoY: number;
  alturaLinha: number;
  /** Largura reservada à numeração, zero quando desligada. */
  calha: number;
  /** Altura da barra de cromo, zero quando desligada. */
  cromo: number;
  /** Quantos dígitos o maior número de linha ocupa. */
  digitos: number;
};

const RECHEIO = 20;
const ESPACO_CALHA = 16;

export function calcularLayout(linhas: Linha[], opcoes: OpcoesLayout): Layout {
  const alturaLinha = Math.round(opcoes.corpo * 1.55);
  const cromo = opcoes.mostrarCromo ? 34 : 0;
  const digitos = String(Math.max(linhas.length, 1)).length;
  const calha = opcoes.mostrarNumeros ? digitos * opcoes.larguraCaractere + ESPACO_CALHA : 0;

  const colunas = linhas.reduce(
    (maior, linha) =>
      Math.max(
        maior,
        linha.reduce((soma, token) => soma + token.texto.length, 0),
      ),
    1,
  );

  const janelaLargura = Math.ceil(RECHEIO * 2 + calha + colunas * opcoes.larguraCaractere);
  const janelaAltura = Math.ceil(cromo + RECHEIO * 2 + linhas.length * alturaLinha);

  return {
    largura: janelaLargura + opcoes.margem * 2,
    altura: janelaAltura + opcoes.margem * 2,
    janelaX: opcoes.margem,
    janelaY: opcoes.margem,
    janelaLargura,
    janelaAltura,
    codigoX: opcoes.margem + RECHEIO + calha,
    codigoY: opcoes.margem + cromo + RECHEIO,
    alturaLinha,
    calha,
    cromo,
    digitos,
  };
}

/** Comprimento da linha em caracteres, usado para posicionar cada token. */
export function comprimentoDaLinha(linha: Linha): number {
  return linha.reduce((soma, token) => soma + token.texto.length, 0);
}
