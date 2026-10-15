import { calcularLayout, corDoEscopo, type Linha, type Tema } from '@minime/core';

/**
 * Desenha a imagem de código direto no canvas.
 *
 * O caminho comum para esse tipo de ferramenta é montar um elemento com HTML e
 * CSS e convertê-lo com html-to-image ou html2canvas. Essas bibliotecas
 * serializam o DOM dentro de um `<foreignObject>` de SVG, e nesse contexto o
 * navegador não carrega fontes externas: o resultado sai com a fonte de
 * sistema em vez da nossa monoespaçada, com espaçamento diferente do que
 * estava na tela. Desenhar à mão é mais código, mas sai idêntico em qualquer
 * navegador e dispensa a dependência.
 */

export type OpcoesDesenho = {
  linhas: Linha[];
  tema: Tema;
  corpo: number;
  mostrarNumeros: boolean;
  mostrarCromo: boolean;
  titulo: string;
  margem: number;
  /** Multiplicador de resolução. 2 ou 3 deixa a imagem nítida em tela retina. */
  escala: number;
};

export const FONTE_CODIGO = "'Geist Mono Variable', ui-monospace, monospace";
export const FONTE_INTERFACE = "'Geist Variable', ui-sans-serif, system-ui, sans-serif";

/**
 * Espera as fontes estarem prontas antes de desenhar.
 *
 * Sem isso o canvas mede e desenha com a fonte de fallback na primeira
 * renderização, e a imagem sai com métrica errada — o erro clássico desse
 * tipo de ferramenta, e silencioso, porque na segunda tentativa funciona.
 */
export async function aguardarFontes(corpo: number): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  try {
    await Promise.all([
      document.fonts.load(`${corpo}px ${FONTE_CODIGO}`),
      document.fonts.load(`600 ${corpo}px ${FONTE_CODIGO}`),
      document.fonts.load(`13px ${FONTE_INTERFACE}`),
    ]);
    await document.fonts.ready;
  } catch {
    /* API indisponível: segue com o que houver */
  }
}

function retanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

/**
 * Desenha e devolve as dimensões lógicas.
 *
 * A largura de caractere é medida no próprio contexto, com a fonte já
 * carregada: assumir uma proporção fixa quebraria com qualquer fonte que não
 * fosse exatamente a esperada.
 */
export function desenhar(canvas: HTMLCanvasElement, opcoes: OpcoesDesenho): void {
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  const { linhas, tema, corpo, escala } = opcoes;

  ctx.font = `${corpo}px ${FONTE_CODIGO}`;
  const larguraCaractere = ctx.measureText('M').width;

  const layout = calcularLayout(linhas, {
    corpo,
    larguraCaractere,
    mostrarNumeros: opcoes.mostrarNumeros,
    mostrarCromo: opcoes.mostrarCromo,
    margem: opcoes.margem,
  });

  canvas.width = Math.ceil(layout.largura * escala);
  canvas.height = Math.ceil(layout.altura * escala);
  canvas.style.width = `${layout.largura}px`;
  canvas.style.height = `${layout.altura}px`;

  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.clearRect(0, 0, layout.largura, layout.altura);
  ctx.textBaseline = 'alphabetic';

  // Fundo em gradiente diagonal.
  const gradiente = ctx.createLinearGradient(0, 0, layout.largura, layout.altura);
  gradiente.addColorStop(0, tema.fundo[0]);
  gradiente.addColorStop(1, tema.fundo[1]);
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, layout.largura, layout.altura);

  // Janela, com sombra desenhada antes e desligada em seguida para não
  // contaminar o texto.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = tema.janela;
  retanguloArredondado(
    ctx,
    layout.janelaX,
    layout.janelaY,
    layout.janelaLargura,
    layout.janelaAltura,
    10,
  );
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = tema.borda;
  ctx.lineWidth = 1;
  retanguloArredondado(
    ctx,
    layout.janelaX + 0.5,
    layout.janelaY + 0.5,
    layout.janelaLargura - 1,
    layout.janelaAltura - 1,
    10,
  );
  ctx.stroke();

  if (layout.cromo > 0) {
    const centroY = layout.janelaY + layout.cromo / 2;

    tema.pontos.forEach((cor, indice) => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(layout.janelaX + 20 + indice * 18, centroY, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (opcoes.titulo.trim() !== '') {
      ctx.fillStyle = tema.numeroLinha;
      ctx.font = `13px ${FONTE_INTERFACE}`;
      ctx.textAlign = 'center';
      ctx.fillText(
        opcoes.titulo,
        layout.janelaX + layout.janelaLargura / 2,
        centroY + 4.5,
        layout.janelaLargura - 160,
      );
      ctx.textAlign = 'left';
    }
  }

  ctx.font = `${corpo}px ${FONTE_CODIGO}`;

  linhas.forEach((linha, indice) => {
    // A baseline fica na parte de baixo da altura de linha, descontando a
    // descida: alinhar pelo topo deixaria o texto colado no cromo.
    const y = layout.codigoY + indice * layout.alturaLinha + corpo * 0.78;

    if (layout.calha > 0) {
      ctx.fillStyle = tema.numeroLinha;
      ctx.textAlign = 'right';
      ctx.fillText(String(indice + 1), layout.codigoX - 16, y);
      ctx.textAlign = 'left';
    }

    let coluna = 0;

    for (const token of linha) {
      ctx.fillStyle = corDoEscopo(tema, token.escopo);
      ctx.fillText(token.texto, layout.codigoX + coluna * larguraCaractere, y);
      coluna += token.texto.length;
    }
  });
}

/** Nome de arquivo previsível, com a data, para não virar "download (3).png". */
export function nomeDoArquivo(linguagem: string): string {
  const agora = new Date();
  const d = (n: number) => String(n).padStart(2, '0');

  return `codigo-${linguagem}-${agora.getFullYear()}${d(agora.getMonth() + 1)}${d(agora.getDate())}-${d(agora.getHours())}${d(agora.getMinutes())}.png`;
}
