/**
 * Formatação, minificação e validação de JSON.
 *
 * O ganho sobre `JSON.parse` cru está no erro: o navegador devolve uma
 * mensagem em inglês com um offset, e aqui ela vira linha, coluna e um trecho
 * do texto em volta — que é o que a pessoa precisa para achar o problema.
 */

export type ErroJson = {
  mensagem: string;
  linha: number;
  coluna: number;
  /** Trecho do texto em volta do erro, para mostrar onde foi. */
  trecho: string;
};

export type ResultadoJson =
  | {
      ok: true;
      saida: string;
      /** Verdadeiro quando a entrada estava embutida numa string e foi desembrulhada. */
      desescapado: boolean;
    }
  | { ok: false; erro: ErroJson };

/** Converte o índice absoluto devolvido pelo parser em linha e coluna. */
function posicao(texto: string, indice: number): { linha: number; coluna: number } {
  const antes = texto.slice(0, indice);
  const linhas = antes.split('\n');

  return { linha: linhas.length, coluna: (linhas.at(-1)?.length ?? 0) + 1 };
}

/**
 * Quantos caracteres de contexto o V8 coloca antes do token problemático no
 * trecho que embute na mensagem.
 */
const CONTEXTO_V8 = 10;

/**
 * Descobre o índice do erro a partir da mensagem do motor.
 *
 * Cada navegador descreve o erro de um jeito, e o V8 mudou o formato: versões
 * recentes não trazem mais "at position N", e sim um trecho do texto embutido
 * na mensagem. São três formatos a reconhecer, nesta ordem:
 *
 *   V8 recente  Unexpected token '}', ..."1,\n  \"b\": }" is not valid JSON
 *   V8 antigo   Unexpected token } in JSON at position 19
 *   Firefox     JSON.parse: ... at line 3 column 9 of the JSON data
 */
function extrairIndice(mensagem: string, entrada: string): number | null {
  const porPosicao = mensagem.match(/at position (\d+)/i);
  if (porPosicao?.[1]) return Number(porPosicao[1]);

  const porLinhaColuna = mensagem.match(/at line (\d+) column (\d+)/i);
  if (porLinhaColuna?.[1] && porLinhaColuna[2]) {
    const linhas = entrada.split('\n');
    const alvo = Number(porLinhaColuna[1]) - 1;
    const antes = linhas.slice(0, alvo).reduce((total, linha) => total + linha.length + 1, 0);

    return antes + Number(porLinhaColuna[2]) - 1;
  }

  if (/Unexpected end of JSON input/i.test(mensagem)) return entrada.length;

  const porTrecho = mensagem.match(/(\.\.\.)?"([\s\S]*)" is not valid JSON/);
  if (porTrecho?.[2]) {
    const truncado = porTrecho[1] !== undefined;
    const trecho = porTrecho[2];
    const inicio = entrada.indexOf(trecho);

    if (inicio === -1) return null;

    // Com reticências, o trecho começa exatamente CONTEXTO_V8 caracteres antes
    // do token. Sem elas, o trecho começa no início da entrada e o token é a
    // primeira ocorrência do caractere citado.
    if (truncado) return inicio + CONTEXTO_V8;

    const token = mensagem.match(/Unexpected token '(.)'/)?.[1];

    return token ? entrada.indexOf(token, inicio) : inicio;
  }

  return null;
}

/**
 * Só desembrulha quando o conteúdo é objeto ou array. Um documento JSON que é
 * apenas a string "42" é legítimo, e transformá-lo no número 42 seria mudar o
 * dado de quem só queria formatá-lo.
 */
function parseDeEstrutura(texto: string): unknown | undefined {
  try {
    const valor = JSON.parse(texto);

    return valor !== null && typeof valor === 'object' ? valor : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Quebra de linha e tabulação crus são inválidos dentro de uma string JSON, e
 * um payload copiado de log costuma trazê-los. Escapar antes de reembrulhar
 * evita que o desescape falhe por causa de um \n no meio.
 */
function escaparControles(texto: string): string {
  const conhecidos: Record<string, string> = {
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
  };

  // biome-ignore lint/suspicious/noControlCharactersInRegex: é exatamente o alvo
  return texto.replace(/[\u0000-\u001f]/g, (caractere) => {
    const pronto = conhecidos[caractere];
    if (pronto) return pronto;

    return `\\u${caractere.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
}

/**
 * JSON que chega escapado — de um log, de uma coluna de texto no banco, do
 * corpo de um webhook que alguém gravou como string. Vem com `\"` no lugar de
 * `"`, às vezes com as aspas externas, às vezes sem.
 *
 * O desescape é feito pelo próprio `JSON.parse`, reembrulhando o texto em
 * aspas, e não por troca de `\"` por `"`: a regra de escape do JSON tem
 * contrabarra dupla, `\uXXXX` e companhia, e um replace ingênuo corrompe
 * justamente os campos que carregam caminho de Windows ou acento escapado.
 */
function desescapar(entrada: string): string | null {
  const texto = entrada.trim();

  // Sem contrabarra antes de aspas não há escape a desfazer.
  if (!texto.includes('\\"')) return null;

  const jaTemAspas = texto.length > 1 && texto.startsWith('"') && texto.endsWith('"');
  const embrulhado = jaTemAspas ? texto : `"${texto}"`;

  try {
    const solto = JSON.parse(escaparControles(embrulhado));

    return typeof solto === 'string' ? solto : null;
  } catch {
    return null;
  }
}

function analisar(entrada: string): { valor: unknown; desescapado: boolean } | { erro: ErroJson } {
  try {
    const valor = JSON.parse(entrada);

    // Entrada que é uma string contendo JSON: `"{\"a\":1}"` passa no parse e
    // devolve texto. Quem colou isso quer ver o objeto, não a string.
    if (typeof valor === 'string') {
      const interno = parseDeEstrutura(valor);

      if (interno !== undefined) return { valor: interno, desescapado: true };
    }

    return { valor, desescapado: false };
  } catch (falha) {
    // Antes de desistir: pode ser JSON escapado sem as aspas externas, que é
    // como um payload sai da maioria dos logs.
    const solto = desescapar(entrada);

    if (solto !== null) {
      const interno = parseDeEstrutura(solto);

      if (interno !== undefined) return { valor: interno, desescapado: true };
    }

    const mensagem = falha instanceof Error ? falha.message : 'JSON inválido.';
    const indice = extrairIndice(mensagem, entrada);

    if (indice === null) {
      return { erro: { mensagem, linha: 1, coluna: 1, trecho: entrada.slice(0, 60) } };
    }

    const { linha, coluna } = posicao(entrada, indice);

    return {
      erro: {
        mensagem,
        linha,
        coluna,
        trecho: entrada.slice(Math.max(0, indice - 30), indice + 30),
      },
    };
  }
}

export function formatarJson(entrada: string, espacos = 2): ResultadoJson {
  if (entrada.trim() === '') {
    return {
      ok: false,
      erro: { mensagem: 'Cole um JSON para formatar.', linha: 1, coluna: 1, trecho: '' },
    };
  }

  const resultado = analisar(entrada);

  if ('erro' in resultado) return { ok: false, erro: resultado.erro };

  return {
    ok: true,
    saida: JSON.stringify(resultado.valor, null, espacos),
    desescapado: resultado.desescapado,
  };
}

export function minificarJson(entrada: string): ResultadoJson {
  if (entrada.trim() === '') {
    return {
      ok: false,
      erro: { mensagem: 'Cole um JSON para minificar.', linha: 1, coluna: 1, trecho: '' },
    };
  }

  const resultado = analisar(entrada);

  if ('erro' in resultado) return { ok: false, erro: resultado.erro };

  return { ok: true, saida: JSON.stringify(resultado.valor), desescapado: resultado.desescapado };
}

/** Ordena as chaves de todo objeto, em qualquer profundidade. */
export function ordenarChaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarChaves);

  if (valor !== null && typeof valor === 'object') {
    const entradas = Object.entries(valor as Record<string, unknown>);

    entradas.sort(([a], [b]) => a.localeCompare(b));

    return Object.fromEntries(entradas.map(([chave, item]) => [chave, ordenarChaves(item)]));
  }

  return valor;
}

export function formatarJsonOrdenado(entrada: string, espacos = 2): ResultadoJson {
  const resultado = analisar(entrada);

  if ('erro' in resultado) return { ok: false, erro: resultado.erro };

  return {
    ok: true,
    saida: JSON.stringify(ordenarChaves(resultado.valor), null, espacos),
    desescapado: resultado.desescapado,
  };
}
