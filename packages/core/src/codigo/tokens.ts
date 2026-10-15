import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/**
 * Converte código em linhas de tokens coloridos.
 *
 * O highlight.js devolve uma string de HTML, que não serve para desenhar no
 * canvas. Aqui ela é varrida e transformada em estrutura de dados — sem tocar
 * no DOM, então a função continua pura e roda igual em teste e no navegador.
 *
 * Só as linguagens listadas são registradas, em vez do pacote inteiro: o
 * bundle completo do highlight.js traz quase duzentas gramáticas. Com este
 * recorte a ilha fica em torno de 26 KB comprimidos — menos que o formatador
 * de SQL, que é a ferramenta mais pesada do site.
 */

export const LINGUAGENS = [
  { id: 'csharp', nome: 'C#' },
  { id: 'sql', nome: 'SQL' },
  { id: 'typescript', nome: 'TypeScript' },
  { id: 'javascript', nome: 'JavaScript' },
  { id: 'json', nome: 'JSON' },
  { id: 'python', nome: 'Python' },
  { id: 'java', nome: 'Java' },
  { id: 'go', nome: 'Go' },
  { id: 'bash', nome: 'Shell' },
  { id: 'yaml', nome: 'YAML' },
  { id: 'xml', nome: 'HTML e XML' },
  { id: 'css', nome: 'CSS' },
  { id: 'texto', nome: 'Texto sem destaque' },
] as const;

export type Linguagem = (typeof LINGUAGENS)[number]['id'];

let registrado = false;

function registrar(): void {
  if (registrado) return;

  hljs.registerLanguage('csharp', csharp);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('css', css);

  registrado = true;
}

/** Escopo do token, já sem o prefixo `hljs-`. `null` é texto comum. */
export type Token = { texto: string; escopo: string | null };
export type Linha = Token[];

const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

function decodificar(texto: string): string {
  return texto.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (casa) => ENTIDADES[casa] ?? casa);
}

/**
 * Varre o HTML do highlight.js acumulando os escopos numa pilha.
 *
 * Os spans vêm aninhados — uma string dentro de um template, por exemplo — e
 * para colorir interessa sempre o escopo mais interno, que é o topo da pilha.
 */
function varrer(html: string): Token[] {
  const tokens: Token[] = [];
  const pilha: string[] = [];

  const padrao = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
  let casa = padrao.exec(html);

  while (casa !== null) {
    const [, classe, texto] = casa;

    if (classe !== undefined) {
      pilha.push(classe.replace(/^hljs-/, '').split(' ')[0] ?? '');
    } else if (texto !== undefined) {
      tokens.push({ texto: decodificar(texto), escopo: pilha.at(-1) ?? null });
    } else {
      pilha.pop();
    }

    casa = padrao.exec(html);
  }

  return tokens;
}

/** Quebra os tokens em linhas, preservando o escopo de cada pedaço. */
function emLinhas(tokens: Token[]): Linha[] {
  const linhas: Linha[] = [[]];

  for (const token of tokens) {
    const pedacos = token.texto.split('\n');

    pedacos.forEach((pedaco, indice) => {
      if (indice > 0) linhas.push([]);
      if (pedaco !== '') linhas.at(-1)?.push({ texto: pedaco, escopo: token.escopo });
    });
  }

  return linhas;
}

export function tokenizar(codigo: string, linguagem: Linguagem): Linha[] {
  if (linguagem === 'texto') {
    return codigo
      .split('\n')
      .map((linha) => (linha === '' ? [] : [{ texto: linha, escopo: null }]));
  }

  registrar();

  try {
    const { value } = hljs.highlight(codigo, { language: linguagem, ignoreIllegals: true });

    return emLinhas(varrer(value));
  } catch {
    // Gramática recusou o texto: melhor mostrar sem cor do que não mostrar.
    return codigo
      .split('\n')
      .map((linha) => (linha === '' ? [] : [{ texto: linha, escopo: null }]));
  }
}
