import { describe, expect, it } from 'vitest';
import { buscarTema, corDoEscopo, TEMAS } from './temas.js';
import { type Linha, tokenizar } from './tokens.js';

/** Remonta o texto a partir das linhas, para conferir que nada se perdeu. */
function remontar(linhas: Linha[]): string {
  return linhas.map((linha) => linha.map((token) => token.texto).join('')).join('\n');
}

function escoposDe(linhas: Linha[]): Set<string> {
  const escopos = new Set<string>();

  for (const linha of linhas) {
    for (const token of linha) {
      if (token.escopo) escopos.add(token.escopo);
    }
  }

  return escopos;
}

describe('tokenizar — fidelidade ao texto', () => {
  const casos: Array<[string, Parameters<typeof tokenizar>[1]]> = [
    ['public class Foo { }', 'csharp'],
    ['SELECT id, nome FROM clientes WHERE ativo = 1', 'sql'],
    ['const x: number = 42;', 'typescript'],
    ['{"a": 1, "b": [true, null]}', 'json'],
    ['def soma(a, b):\n    return a + b', 'python'],
    ['echo "oi" && ls -la', 'bash'],
    ['<p class="x">oi</p>', 'xml'],
  ];

  it.each(casos)('preserva o texto exato de %s', (codigo, linguagem) => {
    expect(remontar(tokenizar(codigo, linguagem))).toBe(codigo);
  });

  it('preserva acentuação', () => {
    const codigo = '// comentário com acentuação e ç\nvar s = "ação";';

    expect(remontar(tokenizar(codigo, 'csharp'))).toBe(codigo);
  });

  it('preserva os caracteres que viram entidade no HTML', () => {
    const codigo = 'if (a < b && c > d) { s = "a&b"; }';

    expect(remontar(tokenizar(codigo, 'javascript'))).toBe(codigo);
  });

  it('preserva indentação e espaços múltiplos', () => {
    const codigo = 'function f() {\n    const a = 1;\n        return a;\n}';

    expect(remontar(tokenizar(codigo, 'javascript'))).toBe(codigo);
  });

  it('preserva linhas em branco no meio', () => {
    const codigo = 'a = 1\n\n\nb = 2';
    const linhas = tokenizar(codigo, 'python');

    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toEqual([]);
    expect(remontar(linhas)).toBe(codigo);
  });
});

describe('tokenizar — escopos', () => {
  it('marca palavra-chave, tipo, comentário e número em C#', () => {
    const escopos = escoposDe(tokenizar('public int x = 1; // nota', 'csharp'));

    expect(escopos.has('keyword')).toBe(true);
    expect(escopos.has('number')).toBe(true);
    expect(escopos.has('comment')).toBe(true);
  });

  it('marca string em SQL', () => {
    const escopos = escoposDe(tokenizar("SELECT * FROM t WHERE n = 'abc'", 'sql'));

    expect(escopos.has('string')).toBe(true);
  });

  it('usa o escopo mais interno quando há aninhamento', () => {
    // Template literal com interpolação: o trecho interpolado é `subst`
    // dentro de uma `string`, e deve ganhar o escopo interno.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a interpolação é o dado do teste
    const linhas = tokenizar('const s = `a ${nome} b`;', 'javascript');
    const escopos = escoposDe(linhas);

    expect(escopos.has('string')).toBe(true);
    expect(escopos.has('subst')).toBe(true);
  });

  it('não marca escopo nenhum no modo texto', () => {
    expect(escoposDe(tokenizar('public class Foo', 'texto')).size).toBe(0);
  });

  it('devolve texto cru sem destaque, preservando linhas', () => {
    const linhas = tokenizar('linha 1\nlinha 2', 'texto');

    expect(linhas).toHaveLength(2);
    expect(remontar(linhas)).toBe('linha 1\nlinha 2');
  });
});

describe('tokenizar — casos de borda', () => {
  it('aguenta string vazia', () => {
    expect(tokenizar('', 'csharp')).toEqual([[]]);
  });

  it('aguenta código que não é da linguagem escolhida', () => {
    const codigo = 'isto não é SQL de jeito nenhum ]]]}}}';

    expect(remontar(tokenizar(codigo, 'sql'))).toBe(codigo);
  });

  it('aguenta arquivo grande sem perder conteúdo', () => {
    const codigo = Array.from({ length: 800 }, (_, i) => `const v${i} = ${i};`).join('\n');
    const linhas = tokenizar(codigo, 'javascript');

    expect(linhas).toHaveLength(800);
    expect(remontar(linhas)).toBe(codigo);
  });
});

describe('temas', () => {
  it('todos têm id e nome únicos', () => {
    expect(new Set(TEMAS.map((t) => t.id)).size).toBe(TEMAS.length);
    expect(new Set(TEMAS.map((t) => t.nome)).size).toBe(TEMAS.length);
  });

  it('todas as cores são hexadecimais válidos', () => {
    for (const tema of TEMAS) {
      const cores = [
        ...tema.fundo,
        tema.janela,
        tema.borda,
        ...tema.pontos,
        tema.numeroLinha,
        tema.texto,
        ...Object.values(tema.escopos),
      ];

      for (const cor of cores) {
        expect(cor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('cai no primeiro tema quando o id não existe', () => {
    expect(buscarTema('inexistente').id).toBe(TEMAS[0]?.id);
  });

  it('usa a cor de texto para escopo nulo ou desconhecido', () => {
    const tema = TEMAS[0] as (typeof TEMAS)[number];

    expect(corDoEscopo(tema, null)).toBe(tema.texto);
    expect(corDoEscopo(tema, 'escopo-que-nao-existe')).toBe(tema.texto);
  });

  it('cobre os escopos que o highlight.js realmente emite', () => {
    const amostra = [
      ...escoposDe(tokenizar('public int x = 1; // n', 'csharp')),
      ...escoposDe(tokenizar("SELECT a FROM t WHERE b='c'", 'sql')),
      ...escoposDe(tokenizar('{"a": 1, "b": null}', 'json')),
      ...escoposDe(tokenizar('def f(a):\n  return "x"', 'python')),
      ...escoposDe(tokenizar('<p class="x">oi</p>', 'xml')),
    ];

    for (const tema of TEMAS) {
      for (const escopo of amostra) {
        expect(tema.escopos[escopo], `${tema.id} não cobre ${escopo}`).toBeDefined();
      }
    }
  });
});
