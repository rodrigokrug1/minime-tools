import { describe, expect, it } from 'vitest';
import { compararTextos, LIMITE_DE_LINHAS, type ParDeLinhas, saoIguais } from './index';

/** Resumo legível de um par, para as asserções ficarem curtas. */
const descrever = (par: ParDeLinhas) =>
  `${par.tipo}:${par.esquerda ? `${par.esquerda.numero}=${par.esquerda.texto}` : '-'}|${
    par.direita ? `${par.direita.numero}=${par.direita.texto}` : '-'
  }`;

describe('compararTextos', () => {
  it('não acusa diferença entre textos idênticos', () => {
    const r = compararTextos('um\ndois\ntrês', 'um\ndois\ntrês');

    expect(saoIguais(r)).toBe(true);
    expect(r.resumo).toEqual({ adicionadas: 0, removidas: 0, alteradas: 0, iguais: 3 });
  });

  it('trata dois textos vazios como iguais', () => {
    expect(saoIguais(compararTextos('', ''))).toBe(true);
  });

  it('numera as linhas de cada lado a partir de 1', () => {
    const r = compararTextos('a\nb', 'a\nb');

    expect(r.pares.map(descrever)).toEqual(['igual:1=a|1=a', 'igual:2=b|2=b']);
  });

  it('reconhece uma linha alterada como par, e não como remoção mais inclusão', () => {
    const r = compararTextos('um\ndois\ntrês', 'um\nDOIS\ntrês');

    expect(r.resumo.alteradas).toBe(1);
    expect(r.resumo.adicionadas).toBe(0);
    expect(r.resumo.removidas).toBe(0);
    expect(r.pares[1]?.tipo).toBe('alterada');
  });

  it('destaca só o trecho que mudou dentro da linha', () => {
    const r = compararTextos('o saldo é 10', 'o saldo é 20');
    const par = r.pares[0];

    expect(par?.esquerda?.pedacos?.filter((p) => p.mudou).map((p) => p.texto)).toEqual(['10']);
    expect(par?.direita?.pedacos?.filter((p) => p.mudou).map((p) => p.texto)).toEqual(['20']);
  });

  it('preserva acentuação no destaque', () => {
    const r = compararTextos('Maria não está ativa', 'Maria nao esta ativa');
    const mudouNaEsquerda = r.pares[0]?.esquerda?.pedacos
      ?.filter((p) => p.mudou)
      .map((p) => p.texto);

    expect(mudouNaEsquerda).toContain('não');
    expect(mudouNaEsquerda).toContain('está');
  });

  it('marca inclusão pura sem lado esquerdo', () => {
    const r = compararTextos('a\nc', 'a\nb\nc');
    const incluida = r.pares.find((p) => p.tipo === 'adicionada');

    expect(incluida?.esquerda).toBeNull();
    expect(incluida?.direita?.texto).toBe('b');
    expect(r.resumo).toMatchObject({ adicionadas: 1, removidas: 0, alteradas: 0 });
  });

  it('marca remoção pura sem lado direito', () => {
    const r = compararTextos('a\nb\nc', 'a\nc');
    const removida = r.pares.find((p) => p.tipo === 'removida');

    expect(removida?.direita).toBeNull();
    expect(removida?.esquerda?.texto).toBe('b');
    expect(r.resumo).toMatchObject({ adicionadas: 0, removidas: 1, alteradas: 0 });
  });

  it('separa o que sobra quando mudam quantidades diferentes de linhas', () => {
    // Duas linhas viram três: duas emparelham, a terceira é inclusão.
    const r = compararTextos('a\nb', 'x\ny\nz');

    expect(r.resumo.alteradas).toBe(2);
    expect(r.resumo.adicionadas).toBe(1);
    expect(r.resumo.removidas).toBe(0);
  });

  it('mantém a numeração correta depois de uma remoção', () => {
    const r = compararTextos('a\nb\nc\nd', 'a\nc\nd');

    expect(r.pares.map(descrever)).toEqual([
      'igual:1=a|1=a',
      'removida:2=b|-',
      'igual:3=c|2=c',
      'igual:4=d|3=d',
    ]);
  });

  it('compara texto contra vazio como remoção de tudo', () => {
    const r = compararTextos('a\nb', '');

    expect(r.resumo.removidas).toBe(2);
    expect(saoIguais(r)).toBe(false);
  });

  it('não confunde quebra final com linha a mais', () => {
    const r = compararTextos('a\nb\n', 'a\nb');

    expect(r.resumo.iguais).toBe(2);
    expect(saoIguais(r)).toBe(true);
  });

  it('trata CRLF e LF como a mesma quebra de linha', () => {
    // Colar de um editor do Windows de um lado e do navegador do outro não
    // pode marcar o texto inteiro como diferente.
    const r = compararTextos('alfa\r\nbravo\r\ncharlie', 'alfa\nbravo\ncharlie');

    expect(saoIguais(r)).toBe(true);
    expect(r.resumo.iguais).toBe(3);
  });

  it('não deixa o \\r vazar para o texto exibido', () => {
    const r = compararTextos('alfa\r\nbravo', 'alfa\nBRAVO');

    expect(r.pares[0]?.esquerda?.texto).toBe('alfa');
    expect(r.pares[1]?.esquerda?.texto).toBe('bravo');
  });

  it('com ignorarEspacos, diferença só de indentação não conta', () => {
    const comOpcao = compararTextos('  a\nb', 'a\n  b', { ignorarEspacos: true });
    const semOpcao = compararTextos('  a\nb', 'a\n  b');

    expect(saoIguais(comOpcao)).toBe(true);
    expect(saoIguais(semOpcao)).toBe(false);
  });

  it('com ignorarCaixa, cada lado continua mostrando a própria grafia', () => {
    const r = compararTextos('Abc\nDef', 'abc\ndef', { ignorarCaixa: true });

    expect(saoIguais(r)).toBe(true);
    expect(r.pares[0]?.esquerda?.texto).toBe('Abc');
    expect(r.pares[0]?.direita?.texto).toBe('abc');
  });

  it('recusa texto acima do limite de linhas', () => {
    const grande = 'linha\n'.repeat(LIMITE_DE_LINHAS + 1);
    const r = compararTextos(grande, 'a');

    expect(r.excedeu).toBe(true);
    expect(r.pares).toEqual([]);
  });

  it('dispensa o destaque em linha muito longa, sem perder a comparação', () => {
    const a = `${'x'.repeat(3000)}A`;
    const b = `${'x'.repeat(3000)}B`;
    const r = compararTextos(a, b);

    expect(r.pares[0]?.tipo).toBe('alterada');
    expect(r.pares[0]?.esquerda?.pedacos).toEqual([{ texto: a, mudou: true }]);
  });

  it('todo par tem ao menos um lado', () => {
    const r = compararTextos('a\nb\nc\nd\ne', 'a\nX\nc\nY\nZ\ne');

    for (const par of r.pares) {
      expect(par.esquerda !== null || par.direita !== null).toBe(true);
    }
  });

  it('a soma do resumo bate com o número de pares', () => {
    const r = compararTextos('a\nb\nc\nd', 'a\nX\nd\nE\nF');
    const { adicionadas, removidas, alteradas, iguais } = r.resumo;

    expect(adicionadas + removidas + alteradas + iguais).toBe(r.pares.length);
  });

  it('as linhas da esquerda, em ordem, reconstroem o texto original', () => {
    const textoA = 'alfa\nbravo\ncharlie\ndelta';
    const r = compararTextos(textoA, 'alfa\nBRAVO\ndelta\necho');
    const reconstruido = r.pares
      .filter((p) => p.esquerda !== null)
      .map((p) => p.esquerda?.texto)
      .join('\n');

    expect(reconstruido).toBe(textoA);
  });

  it('as linhas da direita, em ordem, reconstroem o segundo texto', () => {
    const textoB = 'alfa\nBRAVO\ndelta\necho';
    const r = compararTextos('alfa\nbravo\ncharlie\ndelta', textoB);
    const reconstruido = r.pares
      .filter((p) => p.direita !== null)
      .map((p) => p.direita?.texto)
      .join('\n');

    expect(reconstruido).toBe(textoB);
  });
});
