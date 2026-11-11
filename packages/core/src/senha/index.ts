/**
 * Gerador de senhas.
 *
 * Tudo aqui é função pura sobre as opções recebidas, sem DOM e sem React. A
 * única dependência externa é a Web Crypto, pelo `globalThis`, que existe
 * tanto no navegador quanto no Node a partir da versão 18.
 */

export type OpcoesDeSenha = {
  comprimento: number;
  maiusculas: boolean;
  minusculas: boolean;
  digitos: boolean;
  simbolos: boolean;
  /** Tira os caracteres que se confundem ao ler em papel ou ditar no telefone. */
  semAmbiguos: boolean;
};

export type MotivoSenhaInvalida = 'sem-classes' | 'comprimento' | 'sem-gerador';

export type ResultadoSenha =
  | {
      ok: true;
      senha: string;
      /** Entropia do sorteio, em bits: comprimento × log2(tamanho do alfabeto). */
      entropiaBits: number;
      tamanhoDoAlfabeto: number;
    }
  | { ok: false; erro: MotivoSenhaInvalida };

export const COMPRIMENTO_MINIMO = 4;
export const COMPRIMENTO_MAXIMO = 128;
export const COMPRIMENTO_PADRAO = 20;

/**
 * Os símbolos ficam num conjunto conservador de propósito. Aspas, barra
 * invertida, crase e espaço entram em briga com shell, CSV e formulário mal
 * escrito, e a senha que não dá para colar em lugar nenhum acaba trocada por
 * uma pior.
 */
const ALFABETOS = {
  minusculas: 'abcdefghijklmnopqrstuvwxyz',
  maiusculas: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digitos: '0123456789',
  simbolos: '!@#$%&*-_=+?.,:;',
} as const;

/** Zero e O maiúsculo, um e L minúsculo e I maiúsculo. */
const AMBIGUOS = '0O1lI';

export const MENSAGEM_SENHA: Record<MotivoSenhaInvalida, string> = {
  'sem-classes': 'Escolha pelo menos um tipo de caractere.',
  comprimento: `O comprimento vai de ${COMPRIMENTO_MINIMO} a ${COMPRIMENTO_MAXIMO} caracteres.`,
  'sem-gerador':
    'Este navegador não oferece gerador criptográfico. Não dá para sortear com segurança aqui.',
};

export type Forca = 'fraca' | 'razoavel' | 'boa' | 'excelente';

export const ROTULO_DA_FORCA: Record<Forca, string> = {
  fraca: 'Fraca',
  razoavel: 'Razoável',
  boa: 'Boa',
  excelente: 'Excelente',
};

/**
 * Classifica pela entropia do sorteio, não por regrinha de "tem maiúscula e
 * número". Uma senha de oito caracteres com os quatro tipos é mais fraca que
 * uma de vinte só com letras minúsculas, e a régua de tipos diz o contrário.
 */
export function avaliarForca(entropiaBits: number): Forca {
  if (entropiaBits < 45) return 'fraca';
  if (entropiaBits < 60) return 'razoavel';
  if (entropiaBits < 80) return 'boa';

  return 'excelente';
}

const FAIXA_UINT32 = 2 ** 32;

/**
 * Devolve um sorteador de inteiros sem viés, ou null quando não há gerador
 * criptográfico disponível.
 *
 * Não existe plano B com `Math.random`: ele é previsível a partir de algumas
 * saídas observadas, e uma senha sorteada assim parece boa e não é. Melhor
 * recusar e dizer o motivo do que entregar algo que engana.
 */
function criarSorteador(): ((limite: number) => number) | null {
  const gerador = globalThis.crypto;

  if (typeof gerador?.getRandomValues !== 'function') return null;

  const valores = new Uint32Array(1);

  return (limite: number) => {
    // Amostragem por rejeição. `2^32` não é múltiplo da maioria dos limites, e
    // o resto do `%` faria os primeiros símbolos do alfabeto saírem um pouco
    // mais que os outros. Descartar a sobra do topo custa uma repetição rara e
    // mantém a entropia igual à anunciada.
    const teto = Math.floor(FAIXA_UINT32 / limite) * limite;

    let sorteado: number;

    do {
      gerador.getRandomValues(valores);
      sorteado = valores[0] ?? 0;
    } while (sorteado >= teto);

    return sorteado % limite;
  };
}

function semAmbiguos(alfabeto: string): string {
  return [...alfabeto].filter((caractere) => !AMBIGUOS.includes(caractere)).join('');
}

/** Os alfabetos de cada classe ligada, já sem os ambíguos quando pedido. */
function montarClasses(opcoes: OpcoesDeSenha): string[] {
  const ligadas: string[] = [];

  if (opcoes.minusculas) ligadas.push(ALFABETOS.minusculas);
  if (opcoes.maiusculas) ligadas.push(ALFABETOS.maiusculas);
  if (opcoes.digitos) ligadas.push(ALFABETOS.digitos);
  if (opcoes.simbolos) ligadas.push(ALFABETOS.simbolos);

  return opcoes.semAmbiguos ? ligadas.map(semAmbiguos) : ligadas;
}

export function gerarSenha(opcoes: OpcoesDeSenha): ResultadoSenha {
  const { comprimento } = opcoes;

  if (!Number.isInteger(comprimento)) return { ok: false, erro: 'comprimento' };
  if (comprimento < COMPRIMENTO_MINIMO || comprimento > COMPRIMENTO_MAXIMO) {
    return { ok: false, erro: 'comprimento' };
  }

  const classes = montarClasses(opcoes);

  if (classes.length === 0) return { ok: false, erro: 'sem-classes' };

  const sortear = criarSorteador();

  if (!sortear) return { ok: false, erro: 'sem-gerador' };

  const alfabeto = classes.join('');
  const caracteres: string[] = [];

  // Um de cada classe primeiro, para que "incluir símbolos" signifique mesmo
  // incluir um símbolo. Sorteio livre deixaria a classe de fora de vez em
  // quando, e justo na senha que alguém vai colar num sistema que a exige.
  //
  // Só cabe enquanto houver posição: com menos posições que classes, as
  // sobrantes ficam a cargo do sorteio livre abaixo.
  for (const classe of classes.slice(0, comprimento)) {
    caracteres.push(classe[sortear(classe.length)] ?? '');
  }

  while (caracteres.length < comprimento) {
    caracteres.push(alfabeto[sortear(alfabeto.length)] ?? '');
  }

  // Embaralha, senão as primeiras posições denunciariam a ordem das classes.
  // Fisher-Yates com o mesmo sorteador: embaralhar com `Math.random` aqui
  // desfaria todo o cuidado de cima.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = sortear(i + 1);
    const atual = caracteres[i] as string;

    caracteres[i] = caracteres[j] as string;
    caracteres[j] = atual;
  }

  return {
    ok: true,
    senha: caracteres.join(''),
    entropiaBits: Math.round(comprimento * Math.log2(alfabeto.length)),
    tamanhoDoAlfabeto: alfabeto.length,
  };
}
