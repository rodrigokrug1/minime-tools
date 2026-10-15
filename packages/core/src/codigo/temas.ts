/**
 * Temas da imagem de código.
 *
 * As cores são nossas, derivadas do design system do site — a janela em
 * tinta-violeta com a monoespaçada do MiniMe, não uma cópia da aparência de
 * outra ferramenta. Cada tema diz a cor de cada escopo do highlight.js, mais
 * o fundo, o cromo da janela e a numeração de linha.
 */

export type Tema = {
  id: string;
  nome: string;
  /** Gradiente de fundo, atrás da janela. Dois pontos, do canto a canto. */
  fundo: [string, string];
  /** Fundo da própria janela. */
  janela: string;
  /** Borda sutil da janela. */
  borda: string;
  /** Cor das três bolinhas do cromo, em ordem. */
  pontos: [string, string, string];
  numeroLinha: string;
  texto: string;
  /** Cor por escopo; o que faltar cai em `texto`. */
  escopos: Record<string, string>;
};

/** Paleta base: um escopo que não estiver aqui herda a cor de texto comum. */
function paleta(cores: {
  palavra: string;
  texto: string;
  string: string;
  numero: string;
  comentario: string;
  titulo: string;
  tipo: string;
  literal: string;
}): Record<string, string> {
  return {
    keyword: cores.palavra,
    built_in: cores.tipo,
    type: cores.tipo,
    literal: cores.literal,
    number: cores.numero,
    string: cores.string,
    subst: cores.texto,
    symbol: cores.literal,
    class: cores.titulo,
    function: cores.titulo,
    title: cores.titulo,
    params: cores.texto,
    comment: cores.comentario,
    doctag: cores.comentario,
    meta: cores.comentario,
    'meta-keyword': cores.palavra,
    'meta-string': cores.string,
    section: cores.titulo,
    tag: cores.palavra,
    name: cores.titulo,
    attr: cores.numero,
    attribute: cores.numero,
    variable: cores.texto,
    regexp: cores.string,
    link: cores.string,
    bullet: cores.numero,
    code: cores.texto,
    selector_tag: cores.palavra,
    'selector-tag': cores.palavra,
    'selector-id': cores.titulo,
    'selector-class': cores.numero,
    property: cores.tipo,
    operator: cores.palavra,
    punctuation: cores.texto,
  };
}

export const TEMAS: Tema[] = [
  {
    id: 'carimbo',
    nome: 'Carimbo',
    fundo: ['#6d5bd0', '#3a2f7a'],
    janela: '#1b1925',
    borda: '#2e2a3c',
    pontos: ['#d5453f', '#d9a441', '#2e9e6b'],
    numeroLinha: '#4a4559',
    texto: '#e6e3ef',
    escopos: paleta({
      palavra: '#b3a4ff',
      texto: '#e6e3ef',
      string: '#8fd9b0',
      numero: '#f0b86e',
      comentario: '#6f697f',
      titulo: '#8ecbff',
      tipo: '#7fd4d4',
      literal: '#f08ea8',
    }),
  },
  {
    id: 'tinta',
    nome: 'Tinta',
    fundo: ['#2b2834', '#15141b'],
    janela: '#121119',
    borda: '#2b2834',
    pontos: ['#54505f', '#54505f', '#54505f'],
    numeroLinha: '#413c50',
    texto: '#edebf2',
    escopos: paleta({
      palavra: '#a99aff',
      texto: '#edebf2',
      string: '#86cfa8',
      numero: '#e9b36a',
      comentario: '#625c73',
      titulo: '#84c5f8',
      tipo: '#74cccc',
      literal: '#ec8aa2',
    }),
  },
  {
    id: 'papel',
    nome: 'Papel',
    fundo: ['#e9e7ee', '#cfcbdb'],
    janela: '#fbfafc',
    borda: '#dedae8',
    pontos: ['#d5453f', '#d9a441', '#2e9e6b'],
    numeroLinha: '#b6b1c4',
    texto: '#1b1922',
    escopos: paleta({
      palavra: '#5847c0',
      texto: '#1b1922',
      string: '#17774e',
      numero: '#9a5b14',
      comentario: '#8d879c',
      titulo: '#1d5f9e',
      tipo: '#13706f',
      literal: '#a93358',
    }),
  },
];

export function buscarTema(id: string): Tema {
  return TEMAS.find((tema) => tema.id === id) ?? (TEMAS[0] as Tema);
}

export function corDoEscopo(tema: Tema, escopo: string | null): string {
  if (escopo === null) return tema.texto;

  return tema.escopos[escopo] ?? tema.texto;
}
