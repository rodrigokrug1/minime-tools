/**
 * Comparação entre dois textos, linha a linha.
 *
 * O algoritmo de diferença vem da biblioteca `diff`, e isso é uma exceção
 * deliberada ao que fazemos no resto do núcleo. Dígito verificador, CRC do PIX
 * e cron foram escritos aqui porque a regra é curta e dá para conferir contra
 * uma especificação, caso a caso. Diferença de textos é o algoritmo de Myers:
 * o caminho feliz é fácil, e o que quebra são as bordas que só aparecem meses
 * depois, com alguém que não vai reportar. A biblioteca não tem dependência
 * nenhuma e carrega anos de uso.
 *
 * O que é nosso é tudo em volta: os tipos, o pareamento das linhas, o destaque
 * dentro da linha alterada e os limites. A interface nunca enxerga a `diff`.
 */
import { diffLines, diffWordsWithSpace } from 'diff';

export type TipoDePar = 'igual' | 'alterada' | 'adicionada' | 'removida';

/** Trecho de uma linha alterada. `mudou` marca o que destacar. */
export type Pedaco = {
  texto: string;
  mudou: boolean;
};

export type Lado = {
  /** Número da linha no texto de origem, começando em 1. */
  numero: number;
  texto: string;
  /** Destaque dentro da linha; `null` quando não há par para comparar. */
  pedacos: Pedaco[] | null;
};

export type ParDeLinhas = {
  tipo: TipoDePar;
  esquerda: Lado | null;
  direita: Lado | null;
};

export type Resumo = {
  adicionadas: number;
  removidas: number;
  alteradas: number;
  iguais: number;
};

export type Comparacao = {
  pares: ParDeLinhas[];
  resumo: Resumo;
  /** true quando um dos textos passou do limite e nada foi comparado. */
  excedeu: boolean;
};

export type OpcoesDeComparacao = {
  ignorarEspacos?: boolean;
  ignorarCaixa?: boolean;
};

/**
 * Limites declarados, não descobertos em produção. Acima disso a comparação
 * ainda roda rápido, mas desenhar o resultado trava o navegador — e travar sem
 * explicação é pior que recusar com uma mensagem.
 */
export const LIMITE_DE_LINHAS = 20_000;
export const LIMITE_DE_CARACTERES = 1_000_000;

/**
 * Acima disso o destaque dentro da linha sai. Comparar palavra a palavra uma
 * linha de dez mil caracteres — um JSON minificado colado inteiro numa linha —
 * custa caro e não ajuda ninguém a ler.
 */
const LIMITE_PARA_DESTAQUE = 2_000;

/**
 * Põe os dois textos na mesma convenção antes de comparar.
 *
 * Sem isso, colar de um editor do Windows de um lado e do navegador do outro
 * marcaria *todas* as linhas como diferentes — a quebra `\r\n` contra `\n` faz
 * cada linha divergir no último caractere. É invisível na tela e deixaria a
 * ferramenta com cara de quebrada.
 *
 * A quebra final também sai: para quem cola texto, "termina com enter" não é
 * uma diferença que interesse.
 */
function normalizar(texto: string): string {
  return texto.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

function emLinhas(texto: string): string[] {
  return texto === '' ? [] : texto.split('\n');
}

/** Divide duas linhas em trechos, marcando o que difere de um lado e do outro. */
function destacar(a: string, b: string): { esquerda: Pedaco[]; direita: Pedaco[] } {
  if (a.length > LIMITE_PARA_DESTAQUE || b.length > LIMITE_PARA_DESTAQUE) {
    return { esquerda: [{ texto: a, mudou: true }], direita: [{ texto: b, mudou: true }] };
  }

  const partes = diffWordsWithSpace(a, b);
  const esquerda: Pedaco[] = [];
  const direita: Pedaco[] = [];

  for (const parte of partes) {
    if (!parte.added) esquerda.push({ texto: parte.value, mudou: Boolean(parte.removed) });
    if (!parte.removed) direita.push({ texto: parte.value, mudou: Boolean(parte.added) });
  }

  return { esquerda, direita };
}

export function compararTextos(
  textoA: string,
  textoB: string,
  opcoes: OpcoesDeComparacao = {},
): Comparacao {
  const vazio: Comparacao = {
    pares: [],
    resumo: { adicionadas: 0, removidas: 0, alteradas: 0, iguais: 0 },
    excedeu: false,
  };

  const a = normalizar(textoA);
  const b = normalizar(textoB);
  const linhasA = emLinhas(a);
  const linhasB = emLinhas(b);

  if (
    a.length > LIMITE_DE_CARACTERES ||
    b.length > LIMITE_DE_CARACTERES ||
    linhasA.length > LIMITE_DE_LINHAS ||
    linhasB.length > LIMITE_DE_LINHAS
  ) {
    return { ...vazio, excedeu: true };
  }

  // A caixa é tratada aqui, e não por opção da biblioteca: `ignoreCase` existe
  // em tempo de execução mas não no tipo da comparação por linha, e forçar o
  // tipo esconderia uma incompatibilidade real numa atualização futura.
  // Rebaixar a caixa só do que vai ser comparado é seguro porque o texto
  // exibido sai das linhas originais, nunca do que a biblioteca devolve.
  const paraComparar = (texto: string) => (opcoes.ignorarCaixa ? texto.toLowerCase() : texto);

  const partes = diffLines(paraComparar(a), paraComparar(b), {
    ignoreWhitespace: opcoes.ignorarEspacos ?? false,
  });

  const pares: ParDeLinhas[] = [];
  const resumo: Resumo = { adicionadas: 0, removidas: 0, alteradas: 0, iguais: 0 };

  // Os índices andam sobre as linhas originais, e não sobre o texto devolvido
  // pela biblioteca: com `ignoreCase`, o trecho igual volta com a grafia do
  // segundo texto, e mostrar isso seria mentir sobre o primeiro.
  let ia = 0;
  let ib = 0;
  let i = 0;

  while (i < partes.length) {
    const parte = partes[i];

    if (!parte) break;

    const quantas = parte.count ?? 0;

    if (!parte.added && !parte.removed) {
      for (let n = 0; n < quantas; n++) {
        pares.push({
          tipo: 'igual',
          esquerda: { numero: ia + 1, texto: linhasA[ia] ?? '', pedacos: null },
          direita: { numero: ib + 1, texto: linhasB[ib] ?? '', pedacos: null },
        });
        ia++;
        ib++;
        resumo.iguais++;
      }

      i++;
      continue;
    }

    // Removido seguido de adicionado é uma alteração: as linhas se
    // correspondem e vale destacar a diferença dentro delas. Sem o par, é
    // inclusão ou remoção pura.
    const proxima = partes[i + 1];
    const removidas = parte.removed ? quantas : 0;
    const adicionadas = parte.added ? quantas : proxima?.added ? (proxima.count ?? 0) : 0;

    if (parte.removed && proxima?.added) {
      const emPar = Math.min(removidas, adicionadas);

      for (let n = 0; n < emPar; n++) {
        const linhaA = linhasA[ia] ?? '';
        const linhaB = linhasB[ib] ?? '';
        const { esquerda, direita } = destacar(linhaA, linhaB);

        pares.push({
          tipo: 'alterada',
          esquerda: { numero: ia + 1, texto: linhaA, pedacos: esquerda },
          direita: { numero: ib + 1, texto: linhaB, pedacos: direita },
        });
        ia++;
        ib++;
        resumo.alteradas++;
      }

      for (let n = emPar; n < removidas; n++) {
        pares.push({
          tipo: 'removida',
          esquerda: { numero: ia + 1, texto: linhasA[ia] ?? '', pedacos: null },
          direita: null,
        });
        ia++;
        resumo.removidas++;
      }

      for (let n = emPar; n < adicionadas; n++) {
        pares.push({
          tipo: 'adicionada',
          esquerda: null,
          direita: { numero: ib + 1, texto: linhasB[ib] ?? '', pedacos: null },
        });
        ib++;
        resumo.adicionadas++;
      }

      i += 2;
      continue;
    }

    if (parte.removed) {
      for (let n = 0; n < quantas; n++) {
        pares.push({
          tipo: 'removida',
          esquerda: { numero: ia + 1, texto: linhasA[ia] ?? '', pedacos: null },
          direita: null,
        });
        ia++;
        resumo.removidas++;
      }
    } else {
      for (let n = 0; n < quantas; n++) {
        pares.push({
          tipo: 'adicionada',
          esquerda: null,
          direita: { numero: ib + 1, texto: linhasB[ib] ?? '', pedacos: null },
        });
        ib++;
        resumo.adicionadas++;
      }
    }

    i++;
  }

  return { pares, resumo, excedeu: false };
}

/** true quando os dois textos são iguais sob as opções escolhidas. */
export function saoIguais(comparacao: Comparacao): boolean {
  const { adicionadas, removidas, alteradas } = comparacao.resumo;

  return adicionadas === 0 && removidas === 0 && alteradas === 0;
}
