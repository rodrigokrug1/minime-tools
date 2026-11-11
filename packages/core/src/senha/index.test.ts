import { afterEach, describe, expect, it } from 'vitest';
import {
  avaliarForca,
  COMPRIMENTO_MAXIMO,
  COMPRIMENTO_MINIMO,
  gerarSenha,
  type OpcoesDeSenha,
} from './index.js';

const PADRAO: OpcoesDeSenha = {
  comprimento: 20,
  maiusculas: true,
  minusculas: true,
  digitos: true,
  simbolos: true,
  semAmbiguos: false,
};

function gerar(ajustes: Partial<OpcoesDeSenha> = {}): string {
  const resultado = gerarSenha({ ...PADRAO, ...ajustes });

  if (!resultado.ok) throw new Error(`esperava sucesso, veio ${resultado.erro}`);

  return resultado.senha;
}

describe('gerarSenha', () => {
  it('respeita o comprimento em toda a faixa', () => {
    for (const comprimento of [COMPRIMENTO_MINIMO, 8, 20, 64, COMPRIMENTO_MAXIMO]) {
      expect(gerar({ comprimento })).toHaveLength(comprimento);
    }
  });

  it('usa só os caracteres das classes ligadas', () => {
    expect(gerar({ comprimento: 64, maiusculas: false, digitos: false, simbolos: false })).toMatch(
      /^[a-z]+$/,
    );
    expect(
      gerar({ comprimento: 64, minusculas: false, maiusculas: false, simbolos: false }),
    ).toMatch(/^[0-9]+$/);
  });

  it('inclui pelo menos um caractere de cada classe ligada', () => {
    // Sem a garantia, uma senha curta com quatro classes perde alguma classe
    // de vez em quando — e é sempre naquela que o sistema de destino exige.
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      const senha = gerar({ comprimento: 8 });

      expect(senha, 'minúscula').toMatch(/[a-z]/);
      expect(senha, 'maiúscula').toMatch(/[A-Z]/);
      expect(senha, 'dígito').toMatch(/[0-9]/);
      expect(senha, 'símbolo').toMatch(/[!@#$%&*\-_=+?.,:;]/);
    }
  });

  it('tira os ambíguos quando pedido', () => {
    const junto = Array.from({ length: 50 }, () =>
      gerar({ comprimento: 64, semAmbiguos: true }),
    ).join('');

    for (const ambiguo of ['0', 'O', '1', 'l', 'I']) {
      expect(junto, `ambíguo ${ambiguo}`).not.toContain(ambiguo);
    }
  });

  it('embaralha: a primeira posição não é sempre da mesma classe', () => {
    // Sem o embaralhamento final, a ordem em que as classes são garantidas
    // vazaria nas primeiras posições e a senha teria muito menos variação do
    // que a entropia anunciada sugere.
    const primeiras = new Set(
      Array.from({ length: 200 }, () => gerar({ comprimento: 8 }).charAt(0)),
    );

    expect(primeiras.size).toBeGreaterThan(10);
  });

  it('alcança o primeiro e o último caractere do alfabeto', () => {
    // Guarda contra erro de um a mais ou um a menos no sorteio, que é o jeito
    // clássico de perder silenciosamente uma ponta do alfabeto.
    const junto = Array.from({ length: 200 }, () =>
      gerar({ comprimento: 64, maiusculas: false, digitos: false, simbolos: false }),
    ).join('');

    expect(junto).toContain('a');
    expect(junto).toContain('z');
  });

  it('não repete senha entre chamadas', () => {
    const senhas = new Set(Array.from({ length: 500 }, () => gerar()));

    expect(senhas.size).toBe(500);
  });

  it('distribui as letras de forma plausível', () => {
    // O que este teste pega: erro grosseiro de faixa, caractere nunca sorteado,
    // alfabeto montado errado.
    //
    // O que ele NÃO pega: o viés de módulo que a amostragem por rejeição evita.
    // Com alfabeto de 26 e faixa de 2^32, esse viés é da ordem de 1 em 10^8 —
    // nenhuma amostra viável aqui o distingue de zero. A rejeição está no
    // código por correção, não porque um teste a cobriria.
    const amostra = Array.from({ length: 200 }, () =>
      gerar({
        comprimento: COMPRIMENTO_MAXIMO,
        maiusculas: false,
        digitos: false,
        simbolos: false,
      }),
    ).join('');

    const contagem = new Map<string, number>();

    for (const caractere of amostra) {
      contagem.set(caractere, (contagem.get(caractere) ?? 0) + 1);
    }

    expect(contagem.size).toBe(26);

    const valores = [...contagem.values()];
    const media = valores.reduce((soma, valor) => soma + valor, 0) / valores.length;

    // Faixa larga de propósito: o teste existe para acusar desvio grosseiro,
    // não para falhar de vez em quando por flutuação normal da amostra.
    for (const [caractere, vezes] of contagem) {
      expect(vezes, `letra ${caractere}`).toBeGreaterThan(media * 0.6);
      expect(vezes, `letra ${caractere}`).toBeLessThan(media * 1.4);
    }
  });

  it('calcula a entropia a partir do alfabeto realmente usado', () => {
    const soMinusculas = gerarSenha({
      ...PADRAO,
      comprimento: 20,
      maiusculas: false,
      digitos: false,
      simbolos: false,
    });

    expect(soMinusculas.ok).toBe(true);
    if (!soMinusculas.ok) return;

    expect(soMinusculas.tamanhoDoAlfabeto).toBe(26);
    expect(soMinusculas.entropiaBits).toBe(Math.round(20 * Math.log2(26)));

    const tudo = gerarSenha({ ...PADRAO, comprimento: 20 });

    expect(tudo.ok).toBe(true);
    if (!tudo.ok) return;

    expect(tudo.tamanhoDoAlfabeto).toBe(26 + 26 + 10 + 16);
    expect(tudo.entropiaBits).toBeGreaterThan(soMinusculas.entropiaBits);
  });

  it('recusa quando nenhuma classe está ligada', () => {
    const resultado = gerarSenha({
      ...PADRAO,
      maiusculas: false,
      minusculas: false,
      digitos: false,
      simbolos: false,
    });

    expect(resultado).toEqual({ ok: false, erro: 'sem-classes' });
  });

  it('recusa comprimento fora da faixa ou quebrado', () => {
    for (const comprimento of [0, 3, 129, 1000, 12.5, Number.NaN]) {
      expect(gerarSenha({ ...PADRAO, comprimento }), `comprimento ${comprimento}`).toEqual({
        ok: false,
        erro: 'comprimento',
      });
    }
  });
});

describe('sem gerador criptográfico', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
  });

  it('recusa em vez de cair para Math.random', () => {
    // Senha sorteada com Math.random parece boa e é previsível a partir de
    // algumas saídas. Recusar é a única resposta honesta.
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    expect(gerarSenha(PADRAO)).toEqual({ ok: false, erro: 'sem-gerador' });
  });
});

describe('avaliarForca', () => {
  it('classifica pela entropia, não por variedade de tipos', () => {
    expect(avaliarForca(30)).toBe('fraca');
    expect(avaliarForca(50)).toBe('razoavel');
    expect(avaliarForca(70)).toBe('boa');
    expect(avaliarForca(128)).toBe('excelente');
  });

  it('considera oito caracteres com tudo ligado pior que vinte só com letras', () => {
    const curta = gerarSenha({ ...PADRAO, comprimento: 8 });
    const longa = gerarSenha({
      ...PADRAO,
      comprimento: 20,
      maiusculas: false,
      digitos: false,
      simbolos: false,
    });

    expect(curta.ok && longa.ok).toBe(true);
    if (!curta.ok || !longa.ok) return;

    expect(curta.entropiaBits).toBeLessThan(longa.entropiaBits);
  });
});
