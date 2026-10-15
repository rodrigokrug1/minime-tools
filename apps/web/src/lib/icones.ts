/**
 * Ícones das ferramentas, como formas geométricas tipadas.
 *
 * São desenhados à mão em vez de virem de uma biblioteca: o site não carrega
 * recurso de terceiro, e treze ícones não justificam a dependência. Todos usam
 * a mesma grade de 24 por 24, traço de 1,5 e `currentColor`, então herdam a cor
 * do contexto — inclusive o roxo do item ativo no rail.
 *
 * A representação é estruturada, e não uma string de SVG, para que Astro e
 * React montem os elementos de verdade. Injetar marcação com `innerHTML`
 * funcionaria, mas deixaria um padrão perigoso no código para economizar
 * algumas linhas.
 */

export type FormaIcone =
  | { tipo: 'path'; d: string }
  | { tipo: 'circle'; cx: number; cy: number; r: number }
  | { tipo: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { tipo: 'rect'; x: number; y: number; largura: number; altura: number; rx: number };

const p = (d: string): FormaIcone => ({ tipo: 'path', d });

export const ICONES: Record<string, FormaIcone[]> = {
  'encurtador-de-url': [p('M9 12h6'), p('M10 8H7a4 4 0 0 0 0 8h3'), p('M14 8h3a4 4 0 0 1 0 8h-3')],

  'gerador-de-cpf': [
    { tipo: 'rect', x: 3, y: 5.5, largura: 18, altura: 13, rx: 2 },
    { tipo: 'circle', cx: 8.5, cy: 11, r: 1.8 },
    p('M5.6 16c.6-1.4 1.7-2.1 2.9-2.1s2.3.7 2.9 2.1'),
    p('M14.5 10.5h4'),
    p('M14.5 13.5h3'),
  ],

  'gerador-de-cnpj': [
    p('M4 20.5V6l7-2.5v17'),
    p('M11 20.5h9v-10l-9-2.8'),
    p('M7 9v.01M7 12v.01M7 15v.01M15 12v.01M15 16v.01'),
  ],

  'pix-copia-e-cola': [
    { tipo: 'rect', x: 3.5, y: 3.5, largura: 6, altura: 6, rx: 1 },
    { tipo: 'rect', x: 14.5, y: 3.5, largura: 6, altura: 6, rx: 1 },
    { tipo: 'rect', x: 3.5, y: 14.5, largura: 6, altura: 6, rx: 1 },
    p('M14.5 14.5h3v3h-3z'),
    p('M20.5 17.5v3h-3'),
  ],

  'formatador-de-json': [
    p('M8 4H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1'),
    p('M16 4h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1'),
  ],

  'formatador-de-sql': [
    { tipo: 'ellipse', cx: 12, cy: 6, rx: 7.5, ry: 3 },
    p('M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6'),
    p('M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3'),
  ],

  base64: [p('M4 8.5h10'), p('m11 5.5 3 3-3 3'), p('M20 15.5H10'), p('m13 12.5-3 3 3 3')],

  'decodificador-de-jwt': [
    { tipo: 'circle', cx: 7.5, cy: 12, r: 3.5 },
    p('M11 12h9'),
    p('M17 12v3'),
    p('M20 12v2.5'),
  ],

  'gerador-de-hash': [
    p('M9.5 3.5 7.5 20.5'),
    p('M16.5 3.5 14.5 20.5'),
    p('M4 9h16'),
    p('M3 15h16'),
  ],

  'testador-de-regex': [
    { tipo: 'circle', cx: 10.5, cy: 10.5, r: 6.5 },
    p('m15.5 15.5 5 5'),
    p('M10.5 8v5'),
    p('m8.3 9.2 4.4 2.6'),
    p('m12.7 9.2-4.4 2.6'),
  ],

  'conversor-de-timestamp': [{ tipo: 'circle', cx: 12, cy: 12, r: 8.5 }, p('M12 7.5V12l3 2')],

  'calculadora-de-horas': [
    { tipo: 'circle', cx: 12, cy: 13.5, r: 7.5 },
    p('M12 10v3.8l2.5 1.5'),
    p('M9.5 2.5h5'),
    p('M12 2.5v3'),
  ],

  'imagem-de-codigo': [
    { tipo: 'rect', x: 3, y: 4.5, largura: 18, altura: 15, rx: 2 },
    p('M3 8.5h18'),
    p('M5.5 6.5v.01M8 6.5v.01M10.5 6.5v.01'),
    p('m9 12-2 2 2 2'),
    p('m14 12 2 2-2 2'),
  ],

  cron: [
    { tipo: 'rect', x: 3.5, y: 5, largura: 17, altura: 15.5, rx: 2 },
    p('M3.5 10h17'),
    p('M8 3.5v3'),
    p('M16 3.5v3'),
    p('M7.5 14v.01M12 14v.01M16.5 14v.01M7.5 17.5v.01M12 17.5v.01'),
  ],
};

/** Fallback para um slug sem ícone próprio: um quadrado neutro. */
const PADRAO: FormaIcone[] = [{ tipo: 'rect', x: 4.5, y: 4.5, largura: 15, altura: 15, rx: 2.5 }];

export function iconeDe(slug: string): FormaIcone[] {
  return ICONES[slug] ?? PADRAO;
}
